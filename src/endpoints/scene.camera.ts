import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneCameraEndpoint implements IEndpoint {
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
            console.log(`POST on /scene/camera with session: ${req.body.session}`);

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    const LZString = require("lz-string");
                    let cameraJsonText = LZString.decompressFromBase64(req.body.camera);
                    let cameraJson: any = JSON.parse(cameraJsonText);
        
                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(worker.ip)
                        .then(function(value) {
                            console.log("SceneCameraEndpoint connected to maxscript client, ", value);
        
                            let camera = {
                                name: require('../utils/genRandomName')("camera"),
                                position: [cameraJson.object.position[0], cameraJson.object.position[1], cameraJson.object.position[2]],
                                target: [cameraJson.object.target[0],     cameraJson.object.target[1],   cameraJson.object.target[2]],
                                fov: cameraJson.object.fov * cameraJson.object.aspect
                            };
        
                            maxscriptClient.createTargetCamera(camera)
                                .then(function(value) {
                                    maxscriptClient.disconnect();
                                    console.log(`    OK | camera created`);
                                    res.end(JSON.stringify({ id: camera.name }, null, 2));
                                }.bind(this))
                                .catch(function(err) {
                                    maxscriptClient.disconnect();
                                    console.error(`  FAIL | failed to create camera\n`, err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to create camera" }, null, 2));
                                }.bind(this)); // end of maxscriptClient.createTargetCamera promise
            
                        }.bind(this))
                        .catch(function(err) {
                            console.error("SceneCameraEndpoint failed to connect to maxscript client, ", err);
                        }.bind(this)); // end of maxscriptClient.connect promise
        
                }.bind(this))
                .catch(function(err){
                    console.error(err);
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise

        }.bind(this));

        express.put('/scene/:sceneid/camera/:uid', async function (req, res) {
            let sceneid = req.params.sceneid;
            console.log(`PUT on /scene/${sceneid}/camera/${req.params.uid} with session: ${req.body.session}`);

            let cameraId = req.params.uid;

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    const LZString = require("lz-string");
                    let cameraJsonText = LZString.decompressFromBase64(req.body.camera);
                    let cameraJson: any = JSON.parse(cameraJsonText);
        
                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(worker.ip)
                        .then(function(value) {
                            console.log("SceneCameraEndpoint connected to maxscript client, ", value);
        
                            let camera = {
                                name: cameraId,
                                position: [cameraJson.object.position[0], cameraJson.object.position[1], cameraJson.object.position[2]],
                                target: [cameraJson.object.target[0],     cameraJson.object.target[1],   cameraJson.object.target[2]],
                                fov: cameraJson.object.fov * cameraJson.object.aspect
                            };
        
                            maxscriptClient.updateTargetCamera(camera)
                                .then(function(value) {
                                    maxscriptClient.disconnect();
                                    console.log(`    OK | camera updated`);
                                    res.end(JSON.stringify({ id: camera.name }, null, 2));
                                }.bind(this))
                                .catch(function(err) {
                                    maxscriptClient.disconnect();
                                    console.error(`  FAIL | failed to update camera\n`, err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to update camera" }, null, 2));
                                }.bind(this)); // end of maxscriptClient.createTargetCamera promise
            
                        }.bind(this))
                        .catch(function(err) {
                            console.error("SceneCameraEndpoint failed to connect to maxscript client, ", err);
                        }.bind(this)); // end of maxscriptClient.connect promise
        
                }.bind(this))
                .catch(function(err){
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise

        }.bind(this));

        express.delete('/scene/camera/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /scene/camera/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { SceneCameraEndpoint };