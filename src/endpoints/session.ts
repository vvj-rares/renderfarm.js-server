import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings } from "../interfaces";
import { TYPES } from "../types";
import { WorkerInfo } from "../model/worker_info";

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
                await this._database.expireSessions(this._settings.current.sessionTimeoutMinutes)
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

    async checkApiKey(res: any, apiKey: string): Promise<boolean> {
        try {
            let apiKeyRec = await this._database.getApiKey(apiKey);
            if (!apiKeyRec) {
                console.error(`  FAIL | rejected api key: ${apiKey}\n`);

                res.status(403);
                res.end(JSON.stringify({ error: "api_key rejected" }, null, 2));
                return false;
            }

            console.log(`    OK | accepted api key: ${apiKey}`);

            return true;
        }
        catch(exc) {
            console.error(`  FAIL | failed to check api key: ${apiKey}\n`, exc);

            res.status(500);
            res.end(JSON.stringify({ error: "failed to check api key" }, null, 2));
            return false;
        }
    }

    async checkWorkspace(res: any, apiKey: string, workspaceGuid: string): Promise<boolean> {
        try {
            let workspaceInfo = await this._database.getWorkspace(workspaceGuid);

            console.log(`    OK | accepted workspace guid: ${workspaceInfo.guid}`);

            return true;
        }
        catch(exc) {
            console.error(`  FAIL | workspace guid rejected: ${workspaceGuid}\n`, exc);

            res.status(500);
            res.end(JSON.stringify({ error: "workspace guid rejected" }, null, 2));
            return false;
        }
    }

    bind(express: express.Application) {
        express.post(`/v${this._settings.majorVersion}/session`, async function (req, res) {
            let apiKey = req.body.api_key;
            if (!apiKey) {
                console.log(`REJECT | api_key empty`);
                res.status(400);
                res.end(JSON.stringify({ error: "api_key is missing" }, null, 2));
                return;
            }

            let workspaceGuid = req.body.workspace;
            if (!workspaceGuid) {
                console.log(`REJECT | workspace guid is not provided`);
                res.status(400);
                res.end(JSON.stringify({ error: "workspace is missing" }, null, 2));
                return;
            }

            console.log(`POST on /session with api_key: ${apiKey} with workspace: ${workspaceGuid}`);

            if (!await this.checkApiKey(res, apiKey)) return;
            if (!await this.checkWorkspace(res, apiKey, workspaceGuid)) return;

            const uuidv4 = require('uuid/v4');
            let newSessionGuid = uuidv4();

            this._database.startWorkerSession(apiKey, newSessionGuid)
                .then(async function(value) {
                    
                    let workerInfo = WorkerInfo.fromJSON(value.worker);
                    console.log(`    OK | session ${value.session.guid} assigned to worker ${value.worker.mac}`);

                    this._database.getWorkspace(workspaceGuid)
                        .then(function(workspaceInfo){

                            console.log(`    OK | found workspace`);

                            this._database.assignSessionWorkspace(newSessionGuid, workspaceGuid)
                                .then(function(){
                                    console.log(`    OK | workspace ${workspaceGuid} assigned to session ${newSessionGuid}`);

                                    let maxscriptClient = this._maxscriptClientFactory.create();
                                    maxscriptClient.connect(workerInfo.ip, workerInfo.port)
                                        .then(function(value) {
                                            console.log(`    OK | SessionEndpoint connected to maxscript client`);

                                            maxscriptClient.setSession(newSessionGuid)
                                                .then(function(value) {
                                                    console.log(`    OK | SessionGuid on worker was updated`);

                                                    maxscriptClient.setWorkspace(workspaceInfo)
                                                        .then(function(value) {
                                                            maxscriptClient.disconnect();
                                                            console.log(`    OK | workspace ${workspaceGuid} set to worker: ${workerInfo.ip}:${workerInfo.port}`);
                                                            res.end(JSON.stringify({ guid: newSessionGuid, workspace: workspaceInfo.toJSON() }, null, 2));
                                                        }.bind(this))
                                                        .catch(function(err) {
                                                            maxscriptClient.disconnect();
                                                            console.error(`  FAIL | failed to set workspace\n`, err);
                                                            res.status(500);
                                                            res.end(JSON.stringify({ error: "failed to set workspace" }, null, 2));
                                                        }.bind(this)); // end of maxscriptClient.setWorkspace promise

                                                }.bind(this))
                                                .catch(function(err) {
                                                    maxscriptClient.disconnect();
                                                    console.error(`  FAIL | failed to assign session to worker\n`, err);
                                                    res.status(500);
                                                    res.end(JSON.stringify({ error: "failed to assign session to worker" }, null, 2));
                                                }.bind(this)); // end of maxscriptClient.setSession promise

                                        }.bind(this))
                                        .catch(function(err) {
                                            console.error("SessionEndpoint failed to connect to maxscript client,\n", err);
                                            res.status(500);
                                            res.end(JSON.stringify({ error: "failed to connect to maxscript client" }, null, 2));
                                        }.bind(this)); // end of maxscriptClient.connect promise

                                }.bind(this))
                                .catch(function(err){
                                    console.error("SessionEndpoint failed to assign workspace to session,\n", err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to assign workspace to session" }, null, 2));
                                }.bind(this)); // end of assignSessionWorkspace promise

                        }.bind(this))
                        .catch(function(err){
                            console.error(`  FAIL | failed to get workspace: ${workspaceGuid}\n`, err);
                            res.status(500);
                            res.end(JSON.stringify({ error: "failed to get workspace" }, null, 2));
                            return;
                        }.bind(this)); // end of getWorkspace promise
        
                }.bind(this))
                .catch(function(err) {
                    console.error(`  FAIL | failed to create session: `, err);
                    res.status(500);
                    res.end(JSON.stringify({ error: "failed to create session, " + err }, null, 2));
                }.bind(this)); // end of this._database.startWorkerSession promise

        }.bind(this));

        express.post(`/v1/session/action/:action`, async function(req, res) {
            console.log(`POST on ${req.path} with action: ${req.params.action}`);
            let action = req.params.action;
            if (action === "expireSessions") {
                let expired = await this._database.expireSessions(this._settings.current.sessionTimeoutMinutes);
                res.end(JSON.stringify(expired, null, 2));
            } else if (action === "createSession") {
                let apiKey = req.body.api_key;
                let created = await this._database.createSession(apiKey);
                res.end(JSON.stringify(created, null, 2));
            }

            res.status(400);
            res.end(JSON.stringify({error: "not implemented"}, null, 2));
            
        }.bind(this));

        express.delete(`/v${this._settings.majorVersion}/session/:uid`, async function (req, res) {
            console.log(`DELETE on /v1/session/${req.params.uid}`);

            let sessionGuid = req.params.uid;

            this._database.closeSession(sessionGuid)
                .then(function(value){

                    //now we're going to reset 3ds max as this session is being closed
                    this._database.getWorker(sessionGuid)
                    .then(function(worker){
    
                        let maxscriptClient = this._maxscriptClientFactory.create();
                        maxscriptClient.connect(worker.ip, worker.port)
                            .then(function(value) {

                                maxscriptClient.resetScene()
                                    .then(function(value) {
                                        maxscriptClient.disconnect();
                                        console.log(`    OK | scene reset`);
                                        res.end(JSON.stringify({ success: true }, null, 2));
                                    }.bind(this))
                                    .catch(function(err) {
                                        maxscriptClient.disconnect();
                                        res.status(500);
                                        console.error(`  FAIL | failed to reset worker scene, `, err);
                                        res.end(JSON.stringify({ error: "failed to reset worker scene" }, null, 2));
                                    }.bind(this)); // end of maxscriptClient.resetScene promise
                
                            }.bind(this))
                            .catch(function(err) {
                                res.status(500);
                                console.error("failed to connect session worker, ", err);
                                res.end(JSON.stringify({ error: "failed to connect session worker" }, null, 2));
                            }.bind(this)); // end of maxscriptClient.connect promise
    
                    }.bind(this))
                    .catch(function(err){
                        res.status(500);
                        console.error(`  FAIL | failed to get session worker, `, err);
                        res.end(JSON.stringify({ error: "failed to get session worker" }, null, 2));
                    }.bind(this)); // end of this._database.getWorker promise
                    
                }.bind(this))
                .catch(function(err){
                    res.status(500);
                    console.error(`  FAIL | failed to close session\n`, err);
                    res.end(JSON.stringify({ error: "failed to close session" }, null, 2));
                }.bind(this));

        }.bind(this));
    }
}

export { SessionEndpoint };