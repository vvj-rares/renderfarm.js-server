import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneMaterialEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    // maps uuid of threejs material to material name in 3ds max
    // key is sessionId, cache items are resolved per session
    // value is dictionary of following:
    //     key   is threejs uuid of the threejs material,
    //     value is { maxMatName: string, materialJsonText: string }
    private _materialCache: { [sessionId: string] : { [id: string] : any; }; } = {};

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get('/scene/:sceneid/material', async function (req, res) {
            let sceneid = req.params.sceneid;
            console.log(`GET on /scene/${sceneid}/material with session: ${req.body.session}`);

        }.bind(this));

        express.get('/scene/:sceneid/material/:uid', async function (req, res) {
            let sceneid = req.params.sceneid;
            console.log(`GET on /scene/${sceneid}/material/${req.params.uid} with session: ${req.body.session}`);

        }.bind(this));

        express.post('/scene/:sceneid/material', async function (req, res) {
            let sceneid = req.params.sceneid;
            console.log(`POST on /scene/${sceneid}/material with session: ${req.body.session}`);

            const LZString = require("lz-string");
            let materialJsonText = LZString.decompressFromBase64(req.body.material);
            let materialJson = JSON.parse(materialJsonText);

            if (this._materialCache[req.body.session] !== undefined && this._materialCache[req.body.session][ materialJson.uuid ] !== undefined) {
                // ok this material can be found in 3ds max scene by given name (id)
                let cachedMaterial = this._materialCache[req.body.session][ materialJson.uuid ];

                console.log("Given material already exists");
                res.end(JSON.stringify({ id: cachedMaterial.maxMatName }, null, 2));
            } else {
                // ok this material was never created, let's do it now

                this._database.getWorker(req.body.session)
                    .then(function(worker){

                        materialJson.name = require('../utils/genRandomName')("material");

                        if (this._materialCache[req.body.session] === undefined) {
                            this._materialCache[req.body.session] = {};
                        }
        
                        this._materialCache[req.body.session][ materialJson.uuid ] = {
                            maxMatName:       materialJson.name,
                            materialJsonText: materialJsonText
                        };
        
                        let maxscriptClient = this._maxscriptClientFactory.create();
                        maxscriptClient.connect(worker.ip)
                            .then(function(value) {
                                console.log("SceneMaterialEndpoint connected to maxscript client, ", value);

                                maxscriptClient.createMaterial(materialJson)
                                    .then(function(value) {
                                        maxscriptClient.disconnect();
                                        console.log(`    OK | material created`);
                                        res.end(JSON.stringify({ id: materialJson.name }, null, 2));
                                    }.bind(this))
                                    .catch(function(err) {
                                        maxscriptClient.disconnect();
                                        console.error(`  FAIL | failed to create material\n`, err);
                                        res.status(500);
                                        res.end(JSON.stringify({ error: "failed to create material" }, null, 2));
                                    }.bind(this)); // end of maxscriptClient.createMaterial promise
                
                            }.bind(this))
                            .catch(function(err) {
                                console.error("SceneMaterialEndpoint failed to connect to maxscript client, ", err);
                            }.bind(this)); // end of maxscriptClient.connect promise

                    }.bind(this))
                    .catch(function(err){
                        res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                    }.bind(this)); // end of this._database.getWorker promise
            } // end of if else

        }.bind(this));

        express.put('/scene/:sceneid/material/:uid', async function (req, res) {
            let sceneid = req.params.sceneid;
            console.log(`PUT on /scene/${sceneid}/material/${req.params.uid} with session: ${req.body.session}`);

        }.bind(this));

        express.delete('/scene/:sceneid/material/:uid', async function (req, res) {
            let sceneid = req.params.sceneid;
            console.log(`DELETE on /scene/${sceneid}/material/${req.params.uid} with session: ${req.body.session}`);

        }.bind(this));
    }
}

export { SceneMaterialEndpoint };