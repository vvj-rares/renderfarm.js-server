import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

const settings = require("../settings");

@injectable()
class SceneGeometryEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    // maps uuid of threejs buffer geometry to node name in 3ds max, that was imported from this buffer geometry
    // key is sessionId, cache items are resolved per session
    // value is dictionary of following:
    //     key   is threejs uuid of the buffer geometry,
    //     value is { maxNodeName: string, geometryJsonText: string }
    private _geometryCache: { [sessionId: string] : { [id: string] : any; }; } = {};

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get('/scene/:sceneid/geometry', async function (req, res) {
            console.log(`GET on /scene/${req.params.sceneid}/geometry with session: ${req.body.session}`);
            res.end({});
        }.bind(this));

        express.get('/scene/:sceneid/geometry/:uuid', async function (req, res) {
            console.log(`GET on on /scene/${req.params.sceneid}/geometry/${req.params.uuid} with session: ${req.query.session}`);

            if (this._geometryCache[req.query.session][req.params.uuid] === undefined) {
                res.end({ error: "geometry does not exist"});
                return;
            }

            if (this._geometryCache[req.query.session][req.params.uuid] === undefined) {
                res.end({ error: "geometry does not exist"});
                return;
            }

            res.end(this._geometryCache[req.query.session][req.params.uuid].geometryJsonText);
        }.bind(this));

        express.post('/scene/:sceneid/geometry', async function (req, res) {
            console.log(`POST on /scene/${req.params.sceneid}/geometry with session: ${req.body.session}`);

            const LZString = require("lz-string");
            let geometryJsonText = LZString.decompressFromBase64(req.body.geometry);
            let geometryJson = JSON.parse(geometryJsonText);

            if (this._geometryCache[req.body.session] !== undefined && this._geometryCache[req.body.session][ geometryJson.uuid ] !== undefined) {
                // ok this geometry can be found in 3ds max scene by given name (id)
                console.log("Given geometry already exists");

                // so now we don't need to import BufferGeometry, instead we're going to instance copy existing 3ds max object
                this._database.getWorker(req.body.session)
                    .then(function(worker){
                    
                        //first cache it internally, so that 3ds max can download it
                        let clonedNodeName = require('../utils/genRandomName')("mesh");

                        let cachedGeometry = this._geometryCache[req.body.session][ geometryJson.uuid ];

                        // now let maxscript request it from me
                        let maxscriptClient = this._maxscriptClientFactory.create();
                        maxscriptClient.connect(worker.ip)
                            .then(function(socket) {
                                console.log("SceneGeometryEndpoint connected to maxscript client");

                                maxscriptClient.cloneInstance(cachedGeometry.maxNodeName, clonedNodeName)
                                    .then(function(value) {
                                        maxscriptClient.disconnect(socket);
                                        console.log(`    OK | existing geometry was cloned successfully`);
                                        res.end(JSON.stringify({ id: `${clonedNodeName}` }, null, 2));
                                    }.bind(this))
                                    .catch(function(err) {
                                        maxscriptClient.disconnect();
                                        console.error(`  FAIL | failed to clone scene geometry\n`, err);
                                        res.status(500);
                                        res.end(JSON.stringify({ error: "failed to clone scene geometry" }, null, 2));
                                    }.bind(this)); // end of maxscriptClient.cloneInstance promise
                
                            }.bind(this))
                            .catch(function(err) {
                                console.error("SceneGeometryEndpoint failed to connect to maxscript client, ", err);
                                //todo: res.end is missing here
                            }.bind(this)); // end of maxscriptClient.connect promise

                    }.bind(this))
                    .catch(function(err){
                        //todo: log error to console here
                        res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                    }.bind(this)); // end of this._database.getWorker promise
            } else {
                // ok this geometry was never imported to 3ds max scene, let's do it now

                this._database.getWorker(req.body.session)
                    .then(function(worker){
                    
                        //first cache it internally, so that 3ds max can download it
                        let maxNodeName = require('../utils/genRandomName')("mesh");

                        if (this._geometryCache[req.body.session] === undefined) {
                            this._geometryCache[req.body.session] = {};
                        }

                        this._geometryCache[req.body.session][ geometryJson.uuid ] = {
                            maxNodeName:      maxNodeName,
                            geometryJsonText: geometryJsonText
                        };

                        // now let maxscript request it from me
                        let maxscriptClient = this._maxscriptClientFactory.create();
                        maxscriptClient.connect(worker.ip)
                            .then(function(socket) {
                                console.log("SceneGeometryEndpoint connected to maxscript client");

                                let downloadUrl = `https://${settings.host}:${settings.port}/scene/0/geometry/${geometryJson.uuid}?session=${req.body.session}`;
                                console.log(downloadUrl);

                                let filename = `${maxNodeName}.json`;
                                maxscriptClient.downloadJson(downloadUrl, `C:\\\\Temp\\\\downloads\\\\${filename}`)
                                    .then(function(value) {
                                        // as we have json file saved locally, now it is the time to import it
                                        console.log(`    OK | geometry file downloaded successfully`);
                                        maxscriptClient.importMesh(`C:\\\\Temp\\\\downloads\\\\${filename}`, `${maxNodeName}`)
                                            .then(function(value) {
                                                maxscriptClient.disconnect(socket);
                                                console.log(`    OK | geometry imported successfully`);
                                                res.end(JSON.stringify({ id: `${maxNodeName}` }, null, 2));
                                            }.bind(this))
                                            .catch(function(err) {
                                                maxscriptClient.disconnect();
                                                console.error(`  FAIL | failed to import geometry\n`, err);
                                                res.status(500);
                                                res.end(JSON.stringify({ error: "failed to import geometry" }, null, 2));
                                            }.bind(this)); // end of maxscriptClient.importMesh promise

                                    }.bind(this))
                                    .catch(function(err) {
                                        maxscriptClient.disconnect();
                                        console.error(`  FAIL | failed to download geometry file\n`, err);
                                        res.status(500);
                                        res.end(JSON.stringify({ error: "failed to download geometry file" }, null, 2));
                                    }.bind(this)); // end of maxscriptClient.downloadJson promise
                
                            }.bind(this))
                            .catch(function(err) {
                                console.error("SceneGeometryEndpoint failed to connect to maxscript client, ", err);
                            }.bind(this)); // end of maxscriptClient.connect promise

                    }.bind(this))
                    .catch(function(err){
                        res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                    }.bind(this)); // end of this._database.getWorker promise

            } // end of if
    
        }.bind(this));

        express.put('/scene/:sceneid/geometry/:uid', async function (req, res) {
            console.log(`PUT on on /scene/${req.params.sceneid}/geometry/${req.params.uid}  with session: ${req.body.session}`);
            res.end({});
        }.bind(this));

        express.delete('/scene/:sceneid/geometry/:uid', async function (req, res) {
            console.log(`DELETE on on /scene/${req.params.sceneid}/geometry/${req.params.uid}  with session: ${req.body.session}`);
            res.end({});
        }.bind(this));
    }
}

export { SceneGeometryEndpoint };