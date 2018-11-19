import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SessionEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks) {
        this._database = database;
        this._checks = checks;
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

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({}, null, 2));
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