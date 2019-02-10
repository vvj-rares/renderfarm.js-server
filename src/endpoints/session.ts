import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings, IMaxscriptClient, IWorkerObserver } from "../interfaces";
import { TYPES } from "../types";
import { Session } from "../database/model/session";
import { Worker } from "../database/model/worker";

@injectable()
class SessionEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscript: { [sessionGuid: string] : IMaxscriptClient; } = {}; // keep maxscript connections alive for open sessions
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IWorkerObserver) private _workerObserver: IWorkerObserver,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {

        this._settings = settings;
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;

        //expire sessions by timer
        console.log(`expireSessions: ${this._settings.current.expireSessions}`);
        if (this._settings.current.expireSessions) {
            setInterval(async function() {
                try {
                    await this._database.expireSessions(this._settings.current.sessionTimeoutMinutes)
                        .then(function(guids){

                            //todo: close maxscript connections for these sessions

                            if (guids.length === 0) {
                                return;
                            }
                            console.log(`    OK | expired sessions: ${guids.length}`);
                        }.bind(this))
                        .catch(function(err){
                            console.error(err);
                        }.bind(this));
                } catch (err) {
                    console.error(err);
                }

            }.bind(this), 5000);
        }

        //keep maxscript connections alive until session is not closed or expired
        setInterval(async function() {
            // todo: send keepalive message to maxscript client
        }, 1000);

        this._workerObserver.Subscribe(null, null, this.onWorkerOffline.bind(this), null);
    }

    async validateApiKey(res: any, apiKey: string) {
        try {
            await this._database.getApiKey(apiKey);
            return true;
        } catch (err) {
            console.log(`REJECT | api_key rejected`);
            res.status(403);
            res.end(JSON.stringify({ ok: false, message: "api_key rejected", error: err.message }, null, 2));
            return false;
        }
    }

    async validateWorkspaceGuid(res: any, apiKey: string, workspaceGuid: string)
    {
        try {
            let workspace = await this._database.getWorkspace(workspaceGuid);

            if (workspace.apiKey !== apiKey) {
                console.log(`REJECT | workspace_guid does not belong to provided api_key`);
                res.status(403);
                res.end(JSON.stringify({ ok: false, message: "workspace_guid does not belong to provided api_key", error: null }, null, 2));
                return false;
            }

            return true;

        } catch (err) {
            console.log(`REJECT | workspace_guid rejected`);
            res.status(403);
            res.end(JSON.stringify({ ok: false, message: "workspace_guid rejected", error: err.message }, null, 2));
            return false;
        }
    }

    async onWorkerOffline(w: Worker) {
        console.log("Worker went offline: ", w);

        let worker: Worker;
        try {
            worker = await this._database.getWorker(w.guid);
        }
        catch (err) {
            console.log(`  FAIL | failed to close session ${w.sessionGuid} for dead worker: ${w.guid}: `, err);
            return;
        }

        if (worker.sessionGuid) {
            try {
                await this._database.failSession(worker.sessionGuid, "worker failed");
                console.log(`    OK | closed session ${worker.sessionGuid} for dead worker: ${worker.guid}`);
            } catch (err) {
                console.log(`  FAIL | failed to close session ${worker.sessionGuid} for dead worker: ${worker.guid}: `, err);
            }
        }
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/session/:uid`, async function (req, res) {
            let sessionGuid = req.params.uid;
            console.log(`GET on ${req.path}`);

            let session: Session;
            try {
                session = await this._database.getSession(sessionGuid, { allowClosed: true, readOnly: true });
                if (!session) {
                    console.log(`  FAIL | session not found: ${sessionGuid}`);
                    res.status(404);
                    res.end(JSON.stringify({ ok: false, message: "session not found", error: null }, null, 2));
                    return;
                }
            } catch (err) {
                console.log(`  FAIL | failed to get session: ${sessionGuid}`);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to get session", error: err.message }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "session", data: session.toJSON() }, null, 2));

        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/session`, async function (req, res) {
            let apiKey = req.body.api_key;
            let workspaceGuid = req.body.workspace_guid;
            let sceneFilename = req.body.scene_filename;

            console.log(`POST on ${req.path} with api_key: ${apiKey} with workspace: ${workspaceGuid}`);

            if (!apiKey) {
                console.log(`REJECT | api_key is missing`);
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "api_key is missing", error: null }, null, 2));
                return;
            }

            if (!workspaceGuid) {
                console.log(`REJECT | workspace_guid is missing`);
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "workspace_guid is missing", error: null }, null, 2));
                return;
            }

            if (!await this.validateApiKey(res, apiKey)) return;

            if (!await this.validateWorkspaceGuid(res, apiKey, workspaceGuid)) return;

            let session: Session;
            try {
                session = await this._database.createSession(apiKey, workspaceGuid);
            } catch (err) {
                console.log(`  FAIL | failed to create session, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to create session", error: err.message }, null, 2));
                return;
            }

            // try connect to worker
            let maxscript: IMaxscriptClient = this._maxscriptClientFactory.create();
            this._maxscript[session.guid] = maxscript;

            try {
                await maxscript.connect(session.workerRef.ip, session.workerRef.port);
                console.log(`    OK | SessionEndpoint connected to maxscript client`);
            } catch (err) {
                try {
                    session = await this._database.closeSession(session.guid);
                } catch (sessionErr) {
                    console.log(`  WARN | failed to close session, `, sessionErr);
                }

                console.log(`  FAIL | failed to connect to worker, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to connect to worker", error: err.message, data: session }, null, 2));
                return;
            }

            // try to set maxscript SessionGuid global variable
            try {
                await maxscript.setSession(session.guid);
                console.log(`    OK | SessionGuid on worker was updated`);
            } catch (err) {
                try {
                    session = await this._database.closeSession(session.guid);
                } catch (sessionErr) {
                    console.log(`  WARN | failed to close session, `, sessionErr);
                }

                console.log(`  FAIL | failed to update SessionGuid on worker, `, err);
                maxscript.disconnect();
                res.status(500);
                res.end(JSON.stringify({ ok: false, type: "session", message: "failed to update SessionGuid on worker", error: err.message, data: session }, null, 2));
                return;
            }

            // try to configure 3ds max folders from workspace
            try {
                await maxscript.setWorkspace(session.workspaceRef);
                console.log(`    OK | workspace ${session.workspaceGuid} assigned to session ${session.guid}`);
            } catch (err) {
                try {
                    session = await this._database.closeSession(session.guid);
                } catch (sessionErr) {
                    console.log(`  WARN | failed to close session, `, sessionErr);
                }

                console.log(`  FAIL | failed to set workspace on worker, `, err);
                maxscript.disconnect();
                res.status(500);
                res.end(JSON.stringify({ ok: false, type: "session", message: "failed to set workspace on worker", error: err.message, data: session }, null, 2));
                return;
            }

            //try to open scene if defined
            if (sceneFilename) {
                try {
                    await maxscript.openScene("root", sceneFilename, session.workspaceRef);
                    console.log(`    OK | scene open: ${sceneFilename}`);
                } catch (err) {
                    try {
                        session = await this._database.closeSession(session.guid);
                    } catch (sessionErr) {
                        console.log(`  WARN | failed to close session, `, sessionErr);
                    }
    
                    console.log(`  FAIL | failed to open scene, `, err);
                    maxscript.disconnect();
                    res.status(500);
                    res.end(JSON.stringify({ ok: false, type: "session", message: "failed to open scene on worker", error: err.message, data: session }, null, 2));
                    return;
                }
            }

            maxscript.disconnect();

            res.status(201);
            res.end(JSON.stringify({ ok: true, type: "session", data: { guid: session.guid } }, null, 2));

        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/session/:uid`, async function (req, res) {
            console.log(`DELETE on ${req.path}`);

            let sessionGuid = req.params.uid;

            let closedSession: Session;
            try {
                closedSession = await this._database.closeSession(sessionGuid);
            } catch (err) {
                console.log(`  FAIL | failed to close session, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to close session", error: err.message }, null, 2));
                return;
            }

            // try connect to worker
            let maxscript: IMaxscriptClient = this._maxscriptClientFactory.create();
            try {
                await maxscript.connect(closedSession.workerRef.ip, closedSession.workerRef.port);
                console.log(`    OK | SessionEndpoint connected to maxscript client`);
            } catch (err) {
                console.log(`  FAIL | failed to connect to worker, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to connect to worker", error: err.message }, null, 2));
                return;
            }

            // try to reset maxscript SessionGuid global variable
            try {
                await maxscript.setSession("");
                console.log(`    OK | SessionGuid on worker was updated`);
            } catch (err) {
                console.log(`  FAIL | failed to update SessionGuid on worker, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, type: "session", message: "failed to update SessionGuid on worker", error: err.message }, null, 2));
                return;
            }

            // try to reset 3ds max to initial state
            try {
                await maxscript.resetScene();
                console.log(`    OK | resetScene complete`);
            } catch (err) {
                console.log(`  FAIL | failed to revert 3ds max to initial state, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, type: "session", message: "failed to revert 3ds max to initial state", error: err.message }, null, 2));
                return;
            }

            maxscript.disconnect();

            res.status(200);
            res.end(JSON.stringify({ 
                ok: true, 
                type: "session", 
                data: { 
                    guid: closedSession.guid, 
                    firstSeen: closedSession.firstSeen,
                    closedAt: closedSession.closedAt,
                    closed: closedSession.closed
                } }, null, 2));

                // .then(function(value){

                //     //now we're going to reset 3ds max as this session is being closed
                //     this._database.getWorker(sessionGuid)
                //     .then(function(worker){
    
                //         let maxscriptClient = this._maxscriptClientFactory.create();
                //         maxscriptClient.connect(worker.ip, worker.port)
                //             .then(function(value) {

                //                 maxscriptClient.resetScene()
                //                     .then(function(value) {
                //                         maxscriptClient.disconnect();
                //                         console.log(`    OK | scene reset`);
                //                         res.end(JSON.stringify({ success: true }, null, 2));
                //                     }.bind(this))
                //                     .catch(function(err) {
                //                         maxscriptClient.disconnect();
                //                         res.status(500);
                //                         console.error(`  FAIL | failed to reset worker scene, `, err);
                //                         res.end(JSON.stringify({ error: "failed to reset worker scene" }, null, 2));
                //                     }.bind(this)); // end of maxscriptClient.resetScene promise
                
                //             }.bind(this))
                //             .catch(function(err) {
                //                 res.status(500);
                //                 console.error("failed to connect session worker, ", err);
                //                 res.end(JSON.stringify({ error: "failed to connect session worker" }, null, 2));
                //             }.bind(this)); // end of maxscriptClient.connect promise
    
                //     }.bind(this))
                //     .catch(function(err){
                //         res.status(500);
                //         console.error(`  FAIL | failed to get session worker, `, err);
                //         res.end(JSON.stringify({ error: "failed to get session worker" }, null, 2));
                //     }.bind(this)); // end of this._database.getWorker promise
                    
                // }.bind(this))
                // .catch(function(err){
                //     res.status(500);
                //     console.error(`  FAIL | failed to close session\n`, err);
                //     res.end(JSON.stringify({ error: "failed to close session" }, null, 2));
                // }.bind(this));

        }.bind(this));
    }
}

export { SessionEndpoint };