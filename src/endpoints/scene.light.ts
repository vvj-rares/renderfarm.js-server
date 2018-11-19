import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneLightEndpoint implements IEndpoint {
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
        express.get('/scene/light', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/light with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.get('/scene/light/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/light/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.post('/scene/light', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /scene/light with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            this._maxscriptClient.connect("192.168.0.150")
                .then(function(value) {
                    console.log("SceneLightEndpoint connected to maxscript client, ", value);

                    const uuidv4 = require('uuid/v4');

                    let skylightJson = {
                        name: "skylight_" + uuidv4(),
                        position: [12,0,17]
                    };

                    this._maxscriptClient.createSkylight(skylightJson)
                        .then(function(value) {
                            this._maxscriptClient.disconnect();
                            console.log(`    OK | skylight created`);
                            res.end(JSON.stringify({ id: skylightJson.name }, null, 2));
                        }.bind(this))
                        .catch(function(err) {
                            this._maxscriptClient.disconnect();
                            console.error(`  FAIL | failed to create skylight\n`, err);
                            res.status(500);
                            res.end(JSON.stringify({ error: "failed to create skylight" }, null, 2));
                        }.bind(this))
    
                }.bind(this))
                .catch(function(err) {
                    console.error("SceneLightEndpoint failed to connect to maxscript client, ", err);
                }.bind(this));

        }.bind(this));

        express.put('/scene/light/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /scene/light/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.delete('/scene/light/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /scene/light/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { SceneLightEndpoint };