import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";
import { WorkerInfo } from "../model/worker_info";

@injectable()
class SessionEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._checks = checks;
        this._maxscriptClientFactory = maxscriptClientFactory;

        //expire sessions by timer
        false && setInterval(async function() {
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

    bind(express: express.Application) {
        express.get('/session', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /session with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.get('/session/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /session/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.post('/session', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /session with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            const uuidv4 = require('uuid/v4');
            let newSessionGuid = uuidv4();

            this._database.startWorkerSession(apiKey, newSessionGuid)
                .then(function(value) {
                    
                    let workerInfo = WorkerInfo.fromJSON(value.worker);
                    console.log(`    OK | session ${value.session.guid} assigned to worker ${value.worker.mac}`);

                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(workerInfo.ip)
                        .then(function(value) {
                            console.log("SessionEndpoint connected to maxscript client, ", value);

                            maxscriptClient.setSession(newSessionGuid)
                                .then(function(value) {
                                    maxscriptClient.disconnect();
                                    console.log(`    OK | SessionGuid on worker was updated`);
                                    res.end(JSON.stringify({ id: newSessionGuid }, null, 2));
                                }.bind(this))
                                .catch(function(err) {
                                    maxscriptClient.disconnect();
                                    console.error(`  FAIL | failed to assign session to worker\n`, err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to assign session to worker" }, null, 2));
                                }.bind(this)); // end of maxscriptClient.setSession promise
    
                        }.bind(this))
                        .catch(function(err) {
                            console.error("SessionEndpoint failed to connect to maxscript client, ", err);
                            res.status(500);
                            res.end(JSON.stringify({ error: "failed to connect to maxscript client" }, null, 2));
                        }.bind(this)); // end of maxscriptClient.connect promise

                }.bind(this))
                .catch(function(err) {
                    console.error(`  FAIL | failed to create session\n`, err);
                    res.status(500);
                    res.end(JSON.stringify({ error: "failed to create session", reason: err }, null, 2));
                }.bind(this)); // end of this._database.startWorkerSession promise

        }.bind(this));

        express.put('/session/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /session/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.delete('/session/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /session/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));
    }
}

export { SessionEndpoint };