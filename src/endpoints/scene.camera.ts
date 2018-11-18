import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneCameraEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks) {
        this._database = database;
        this._checks = checks;
    }

    bind(express: express.Application) {
        express.get('/scene/camera', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/camera with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.get('/scene/camera/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/camera/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.post('/scene/camera', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /scene/camera with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.put('/scene/camera/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /scene/camera/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.delete('/scene/camera/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /scene/camera/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { SceneCameraEndpoint };