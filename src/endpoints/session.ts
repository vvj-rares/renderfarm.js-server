import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings } from "../interfaces";
import { TYPES } from "../types";
import { Session } from "../database/model/session";

@injectable()
class SessionEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {

        this._settings = settings;
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;

        //expire sessions by timer
        if (this._settings.current.expireSessions) {
            setInterval(async function() {
                this._database.expireSessions(this._settings.current.sessionTimeoutMinutes)
                    .then(function(guids){
                        if (guids.length === 0) {
                            return;
                        }
                        console.log(`    OK | expired sessions: ${guids.length}`);
                    }.bind(this))
                    .catch(function(err){
                        console.error(err);
                    }.bind(this));

            }.bind(this), 5000);
        }
    }

    async validateApiKey(res: any, apiKey: string) {
        try {
            await this._database.getApiKey(apiKey);
            return true;
        } catch (err) {
            console.log(`REJECT | api_key rejected`);
            res.status(403);
            res.end(JSON.stringify({ ok: false, message: "api_key rejected", error: {} }, null, 2));
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
                res.end(JSON.stringify({ ok: false, message: "workspace_guid does not belong to provided api_key", error: {} }, null, 2));
                return false;
            }

            return true;

        } catch (err) {
            console.log(`REJECT | workspace_guid rejected`);
            res.status(403);
            res.end(JSON.stringify({ ok: false, message: "workspace_guid rejected", error: {} }, null, 2));
            return false;
        }
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/session/:uid`, async function (req, res) {
            let sessionGuid = req.params.uid;
            console.log(`GET on ${req.path}`);

            let session: Session;
            try {
                session = await this._database.getSession(sessionGuid, { allowClosed: true, readOnly: true });
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
            console.log(`POST on ${req.path} with api_key: ${apiKey} with workspace: ${workspaceGuid}`);

            if (!apiKey) {
                console.log(`REJECT | api_key is missing`);
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "api_key is missing", error: {} }, null, 2));
                return;
            }

            if (!workspaceGuid) {
                console.log(`REJECT | workspace_guid is missing`);
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "workspace_guid is missing", error: {} }, null, 2));
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

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "session", data: { guid: session.guid } }, null, 2));

                //.then(async function(value) {
                //    throw Error("POST on /session is inconclusive");
                //    let workerInfo: any = {};
                //    // let workerInfo = WorkerInfo.fromJSON(value.worker);
                //    console.log(`    OK | session ${value.session.guid} assigned to worker ${value.worker.mac}`);

                //    this._database.getWorkspace(workspaceGuid)
                //        .then(function(workspaceInfo){

                //            console.log(`    OK | found workspace`);

                //            this._database.assignSessionWorkspace(newSessionGuid, workspaceGuid)
                //                .then(function(){
                //                    console.log(`    OK | workspace ${workspaceGuid} assigned to session ${newSessionGuid}`);

                //                    let maxscriptClient = this._maxscriptClientFactory.create();
                //                    maxscriptClient.connect(workerInfo.ip, workerInfo.port)
                //                        .then(function(value) {
                //                            console.log(`    OK | SessionEndpoint connected to maxscript client`);

                //                            maxscriptClient.setSession(newSessionGuid)
                //                                .then(function(value) {
                //                                    console.log(`    OK | SessionGuid on worker was updated`);

                //                                    maxscriptClient.setWorkspace(workspaceInfo)
                //                                        .then(function(value) {
                //                                            maxscriptClient.disconnect();
                //                                            console.log(`    OK | workspace ${workspaceGuid} set to worker: ${workerInfo.ip}:${workerInfo.port}`);
                //                                            res.end(JSON.stringify({ guid: newSessionGuid, workspace: workspaceInfo.toJSON() }, null, 2));
                //                                        }.bind(this))
                //                                        .catch(function(err) {
                //                                            maxscriptClient.disconnect();
                //                                            console.error(`  FAIL | failed to set workspace\n`, err);
                //                                            res.status(500);
                //                                            res.end(JSON.stringify({ error: "failed to set workspace" }, null, 2));
                //                                        }.bind(this)); // end of maxscriptClient.setWorkspace promise

                //                                }.bind(this))
                //                                .catch(function(err) {
                //                                    maxscriptClient.disconnect();
                //                                    console.error(`  FAIL | failed to assign session to worker\n`, err);
                //                                    res.status(500);
                //                                    res.end(JSON.stringify({ error: "failed to assign session to worker" }, null, 2));
                //                                }.bind(this)); // end of maxscriptClient.setSession promise

                //                        }.bind(this))
                //                        .catch(function(err) {
                //                            console.error("SessionEndpoint failed to connect to maxscript client,\n", err);
                //                            res.status(500);
                //                            res.end(JSON.stringify({ error: "failed to connect to maxscript client" }, null, 2));
                //                        }.bind(this)); // end of maxscriptClient.connect promise

                //                }.bind(this))
                //                .catch(function(err){
                //                    console.error("SessionEndpoint failed to assign workspace to session,\n", err);
                //                    res.status(500);
                //                    res.end(JSON.stringify({ error: "failed to assign workspace to session" }, null, 2));
                //                }.bind(this)); // end of assignSessionWorkspace promise

                //        }.bind(this))
                //        .catch(function(err){
                //            console.error(`  FAIL | failed to get workspace: ${workspaceGuid}\n`, err);
                //            res.status(500);
                //            res.end(JSON.stringify({ error: "failed to get workspace" }, null, 2));
                //        }.bind(this)); // end of getWorkspace promise
        
                //}.bind(this))
                //.catch(function(err) {
                //    console.error(`  FAIL | failed to create session: `, err);
                //    res.status(500);
                //    res.end(JSON.stringify({ error: "failed to create session, " + err }, null, 2));
                //}.bind(this)); // end of this._database.startWorkerSession promise

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