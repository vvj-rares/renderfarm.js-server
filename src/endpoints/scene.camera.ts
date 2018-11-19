import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneCameraEndpoint implements IEndpoint {
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

            this._maxscriptClient.connect("192.168.0.150")
                .then(function(value) {
                    console.log("SceneCameraEndpoint connected to maxscript client, ", value);

                    const uuidv4 = require('uuid/v4');

                    let cameraJson = {
                        name: "camera_" + uuidv4(),
                        position: [100,50,20],
                        target: [5,10,1],
                        fov: 54
                    };

                    this._maxscriptClient.createTargetCamera(cameraJson)
                        .then(function(value) {
                            this._maxscriptClient.disconnect();
                            console.log(`    OK | camera created`);
                            res.send(JSON.stringify({ id: cameraJson.name }, null, 2));
                        }.bind(this))
                        .catch(function(err) {
                            this._maxscriptClient.disconnect();
                            console.error(`  FAIL | failed to create camera\n`, err);
                            res.status(500);
                            res.send(JSON.stringify({ error: "failed to create camera" }, null, 2));
                        }.bind(this))
    
                }.bind(this))
                .catch(function(err) {
                    console.error("SceneCameraEndpoint failed to connect to maxscript client, ", err);
                }.bind(this));

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