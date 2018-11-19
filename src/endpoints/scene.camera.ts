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

            const LZString = require("lz-string");
            let cameraJsonText = LZString.decompressFromBase64(req.body.camera_data);
            let cameraJson: any = JSON.parse(cameraJsonText);

            console.log(cameraJson);

            this._maxscriptClient.connect("192.168.0.150")
                .then(function(value) {
                    console.log("SceneCameraEndpoint connected to maxscript client, ", value);

                    let camera = {
                        name: require('../utils/genRandomName')("camera"),
                        position: [cameraJson.object.position[0], cameraJson.object.position[1], cameraJson.object.position[2]],
                        target: [cameraJson.object.target[0],     cameraJson.object.target[1],   cameraJson.object.target[2]],
                        fov: cameraJson.object.fov * cameraJson.object.aspect
                    };

                    console.log(" >> " + JSON.stringify(camera) );

                    this._maxscriptClient.createTargetCamera(camera)
                        .then(function(value) {
                            this._maxscriptClient.disconnect();
                            console.log(`    OK | camera created`);
                            res.end(JSON.stringify({ id: camera.name }, null, 2));
                        }.bind(this))
                        .catch(function(err) {
                            this._maxscriptClient.disconnect();
                            console.error(`  FAIL | failed to create camera\n`, err);
                            res.status(500);
                            res.end(JSON.stringify({ error: "failed to create camera" }, null, 2));
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