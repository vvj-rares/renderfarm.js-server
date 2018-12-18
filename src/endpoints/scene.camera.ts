import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneCameraEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get('/scene/:sceneid/camera', async function (req, res) {
            console.log(`GET on /scene/${req.params.sceneid}/camera with session: ${req.body.session}`);
            res.end({});
        }.bind(this));

        express.get('/scene/:sceneid/camera/:uid', async function (req, res) {
            console.log(`GET on /scene/${req.params.sceneid}/camera/${req.params.uid} with session: ${req.body.session}`);
            res.end({});
        }.bind(this));

        express.post('/scene/:sceneid/camera', async function (req, res) {
            console.log(`POST on /scene/${req.params.sceneid}/camera with session: ${req.body.session}`);

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    const LZString = require("lz-string");
                    let cameraJsonText = LZString.decompressFromBase64(req.body.camera);
                    let cameraJson: any = JSON.parse(cameraJsonText);

                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(worker.ip, worker.port)
                        .then(function(value) {
                            console.log("SceneCameraEndpoint connected to maxscript client, ", value);
        
                            let camera = {
                                name: require('../utils/genRandomName')("camera"),
                                matrix: cameraJson.object.matrix,
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
                    maxscriptClient.connect(worker.ip, worker.port)
                        .then(function(value) {
                            console.log("SceneCameraEndpoint connected to maxscript client, ", value);
        
                            let camera = {
                                name: cameraId,
                                position: cameraJson.object.position,
                                quaternion: cameraJson.object.quaternion,
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

        express.delete('/scene/:sceneid/camera/:uid', async function (req, res) {
            console.log(`DELETE on /scene/${req.params.sceneid}/camera/${req.params.uid} with session: ${req.body.session}`);
            res.end({});
        }.bind(this));
    }
}

export { SceneCameraEndpoint };