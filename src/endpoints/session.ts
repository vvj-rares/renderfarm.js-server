import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";
import { WorkerInfo } from "../model/worker_info";

@injectable()
class SessionEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {

        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;

        //expire sessions by timer
        setInterval(async function() {
            await this._database.expireSessions()
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

    async checkApiKey(res: any, apiKey: string): Promise<boolean> {
        try {
            let apiKeyRec = await this._database.getApiKey(apiKey);
            if (!apiKeyRec.value) {
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
            let wsRec = await this._database.getWorkspace(workspaceGuid);
            if (!wsRec.value) {
                console.error(`  FAIL | rejected workspace guid: ${workspaceGuid}\n`);

                res.status(403);
                res.end(JSON.stringify({ error: "workspace guid rejected" }, null, 2));
                return false;
            }

            console.log(`    OK | accepted workspace guid: ${workspaceGuid}`);

            return true;
        }
        catch(exc) {
            console.error(`  FAIL | failed to check workspace guid: ${workspaceGuid}\n`, exc);

            res.status(500);
            res.end(JSON.stringify({ error: "failed to check workspace guid" }, null, 2));
            return false;
        }
    }

    bind(express: express.Application) {
        express.post('/session', async function (req, res) {
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

                            if (!workspaceInfo.value) {
                                console.error(`  FAIL | workspace not found: ${workspaceGuid}`);
                                res.status(500);
                                res.end(JSON.stringify({ error: "workspace not found" }, null, 2));
                                return;
                            }

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

                                                    maxscriptClient.setWorkspace(workspaceInfo.value)
                                                        .then(function(value) {
                                                            maxscriptClient.disconnect();
                                                            console.log(`    OK | workspace ${workspaceGuid} set to worker: ${workerInfo.ip}:${workerInfo.port}`);
                                                            res.end(JSON.stringify({ id: newSessionGuid, workspace: workspaceInfo.name }, null, 2));
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
                    res.end(JSON.stringify({ error: "failed to create session", reason: err }, null, 2));
                }.bind(this)); // end of this._database.startWorkerSession promise

        }.bind(this));

        express.delete('/session/:uid', async function (req, res) {
            console.log(`DELETE on /session/${req.params.uid}`);

            let sessionGuid = req.params.uid;

            this._database.closeSession(sessionGuid)
                .then(function(value){

                    //now we're going to reset 3ds max as this session is being closed
                    this._database.getWorker(req.body.session)
                    .then(function(worker){
    
                        let maxscriptClient = this._maxscriptClientFactory.create();
                        maxscriptClient.connect(worker.ip, worker.port)
                            .then(function(value) {
                                console.log("SessionEndpoint connected to maxscript client, ", value);

                                maxscriptClient.resetScene()
                                    .then(function(value) {
                                        maxscriptClient.disconnect();
                                        console.log(`    OK | scene reset`);
                                        res.end(JSON.stringify({ success: true, message: "session closed" }, null, 2));
                                    }.bind(this))
                                    .catch(function(err) {
                                        maxscriptClient.disconnect();
                                        console.error(`  WARN | failed to reset scene after session close\n`, err);
                                        res.end(JSON.stringify({ success: true, message: "session closed" }, null, 2));
                                    }.bind(this)); // end of maxscriptClient.resetScene promise
                
                            }.bind(this))
                            .catch(function(err) {
                                console.error("SessionEndpoint failed to connect to maxscript client, ", err);
                                res.end(JSON.stringify({ success: true, message: "session closed" }, null, 2));
                            }.bind(this)); // end of maxscriptClient.connect promise
    
                    }.bind(this))
                    .catch(function(err){
                        console.error(`  FAIL | failed to close expired session\n`, err);
                        res.end(JSON.stringify({ error: "failed to close expired session" }, null, 2));
                    }.bind(this)); // end of this._database.getWorker promise
                    
                }.bind(this))
                .catch(function(err){
                    console.error(`  FAIL | failed to close session\n`, err);
                    res.end(JSON.stringify({ error: "failed to close session" }, null, 2));
                }.bind(this));

        }.bind(this));
    }
}

export { SessionEndpoint };