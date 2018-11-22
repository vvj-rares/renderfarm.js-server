import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._checks = checks;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get('/scene', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.get('/scene/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.post('/scene', async function (req, res) {
            console.log(`POST on /scene with session: ${req.body.session}`);

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(worker.ip)
                        .then(function(value) {
                            console.log("SceneEndpoint connected to maxscript client, ", value);

                            maxscriptClient.resetScene()
                            .then(function(value) {
                                maxscriptClient.disconnect();
                                console.log(`    OK | scene reset`);
                                res.end(JSON.stringify({ success: true, message: "created empty scene" }, null, 2));
                            }.bind(this))
                            .catch(function(err) {
                                maxscriptClient.disconnect();
                                console.error(`  FAIL | failed to reset scene\n`, err);
                                res.status(500);
                                res.end(JSON.stringify({ error: "failed to reset scene" }, null, 2));
                            }.bind(this))
            
                        }.bind(this))
                        .catch(function(err) {
                            console.error("SceneEndpoint failed to connect to maxscript client, ", err);
                        }.bind(this)); // end of maxscriptClient.connect promise

                }.bind(this))
                .catch(function(err){
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise
    
        }.bind(this));

        express.put('/scene/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /scene/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;
            
        }.bind(this));

        express.delete('/scene/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /scene/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { SceneEndpoint };