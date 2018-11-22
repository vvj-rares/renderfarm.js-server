import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneMeshEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;
    private _maxscriptClientFactory: IMaxscriptClientFactory;
    private _meshes: { [id: string] : any; } = {};

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._checks = checks;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get('/scene/mesh', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/mesh with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.get('/scene/mesh/:uid', async function (req, res) {
            if (this._meshes[req.params.uid] === undefined) {
                res.end({ error: "mesh not found"});
                return;
            }
            res.end(this._meshes[req.params.uid]);
        }.bind(this));

        express.post('/scene/mesh', async function (req, res) {
            console.log(`POST on /scene/mesh with session: ${req.body.session}`);

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    const LZString = require("lz-string");
                    let sceneJsonText = LZString.decompressFromBase64(req.body.mesh);
                    let materialName = req.body.material;

                    const meshId = require('../utils/genRandomName')("mesh");
                    this._meshes[meshId] = sceneJsonText;

                    // now let maxscript request mesh from me
                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(worker.ip)
                        .then(function(socket) {
                            console.log("SceneMeshEndpoint connected to maxscript client");

                            let filename = `${meshId}.json`;
                            maxscriptClient.downloadJson(`https://192.168.0.200:8000/scene/mesh/${meshId}`, `C:\\\\Temp\\\\downloads\\\\${filename}`)
                                .then(function(value) {
                                    // as we have json file saved locally, now it is the time to import it
                                    console.log(`    OK | json file downloaded successfully`);
                                    maxscriptClient.importMesh(`C:\\\\Temp\\\\downloads\\\\${filename}`, `${meshId}`)
                                        .then(function(value) {
                                            if (materialName !== undefined) {
                                                maxscriptClient.assignMaterial(materialName, meshId)
                                                    .then(function(value) {
                                                        maxscriptClient.disconnect(socket);
                                                        console.log(`    OK | mesh imported successfully`);
                                                        res.end(JSON.stringify({ id: `${meshId}`, materialId: materialName }, null, 2));
                                                    }.bind(this))
                                                    .catch(function(err) {
                                                        maxscriptClient.disconnect();
                                                        console.error(`  FAIL | failed to assign material\n`, err);
                                                        res.status(500);
                                                        res.end(JSON.stringify({ error: "failed to assign material" }, null, 2));
                                                    }.bind(this)); // end of maxscriptClient.assignMaterial promise
                                            } else {
                                                maxscriptClient.disconnect(socket);
                                                console.log(`    OK | mesh imported successfully`);
                                                res.end(JSON.stringify({ id: `${meshId}` }, null, 2));
                                            }
                                        }.bind(this))
                                        .catch(function(err) {
                                            maxscriptClient.disconnect();
                                            console.error(`  FAIL | failed to import mesh\n`, err);
                                            res.status(500);
                                            res.end(JSON.stringify({ error: "failed to import mesh" }, null, 2));
                                        }.bind(this)); // end of maxscriptClient.importMesh promise

                                }.bind(this))
                                .catch(function(err) {
                                    maxscriptClient.disconnect();
                                    console.error(`  FAIL | failed to download json file\n`, err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to download json file" }, null, 2));
                                }.bind(this)); // end of maxscriptClient.downloadJson promise
            
                        }.bind(this))
                        .catch(function(err) {
                            console.error("SceneMeshEndpoint failed to connect to maxscript client, ", err);
                        }.bind(this)); // end of maxscriptClient.connect promise

                }.bind(this))
                .catch(function(err){
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise
    
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