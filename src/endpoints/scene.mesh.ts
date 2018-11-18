import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneMeshEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks) {
        this._database = database;
        this._checks = checks;
    }

    bind(express: express.Application) {
        express.get('/scene/mesh', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/mesh with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.get('/scene/mesh/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/mesh/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.post('/scene/mesh', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /scene/mesh with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.put('/scene/mesh/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /scene/mesh/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.delete('/scene/mesh/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /scene/mesh/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { SceneMeshEndpoint };