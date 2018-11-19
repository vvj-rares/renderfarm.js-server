import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";
import { timingSafeEqual } from "crypto";

@injectable()
class SceneEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;
    private _maxscriptClient: IMaxscriptClient;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks,
                @inject(TYPES.IMaxscriptClient) maxscriptClient: IMaxscriptClient) {
        this._database = database;
        this._checks = checks;
        this._maxscriptClient = maxscriptClient;
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
            let apiKey = req.body.api_key;
            console.log(`POST on /scene with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            //todo: this call must be evaluated with valid sessionID, so that we know which node is owned by the client

            this._maxscriptClient.connect("192.168.0.150")
                .then(function(value) {
                    console.log("SceneEndpoint connected to maxscript client, ", value);

                    this._maxscriptClient.resetScene()
                    .then(function(value) {
                        this._maxscriptClient.disconnect();
                        console.log(`    OK | scene reset`);
                        res.send(JSON.stringify({}, null, 2));
                    }.bind(this))
                    .catch(function(err) {
                        this._maxscriptClient.disconnect();
                        console.error(`  FAIL | failed to reset scene\n`, err);
                        res.status(500);
                        res.send(JSON.stringify({ error: "failed to reset scene" }, null, 2));
                    }.bind(this))
    
                }.bind(this))
                .catch(function(err) {
                    console.error("SceneEndpoint failed to connect to maxscript client, ", err);
                }.bind(this));
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