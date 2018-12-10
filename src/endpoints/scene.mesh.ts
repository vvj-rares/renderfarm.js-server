import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneMeshEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get('/scene/:sceneid/mesh', async function (req, res) {
            console.log(`GET on /scene/${req.params.sceneid}/mesh with session: ${req.body.session}`);
            res.end({});
        }.bind(this));

        express.get('/scene/:sceneid/mesh/:uuid', async function (req, res) {
            console.log(`GET on on /scene/${req.params.sceneid}/mesh/${req.params.uuid}`);
            res.end({});
        }.bind(this));

        express.post('/scene/:sceneid/mesh', async function (req, res) {
            console.log(`POST on /scene/${req.params.sceneid}/mesh with session: ${req.body.session}`);

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    const LZString = require("lz-string");
                    let matrixWorldText = LZString.decompressFromBase64(req.body.matrixWorld);
                    let matrixWorldArray = JSON.parse(matrixWorldText);
                
                    let parentName = req.body.parentName;
                    let geometryName = req.body.geometryName;
                    let materialName = req.body.materialName;

                    // now let maxscript request it from me
                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(worker.ip)
                        .then(function(socket) {
                            console.log("SceneMeshEndpoint connected to maxscript client");

                            maxscriptClient.setObjectWorldMatrix(geometryName, matrixWorldArray)
                                .then(function(value) {
                                    console.log(`    OK | node world matrix set successfully`);

                                    maxscriptClient.assignMaterial(geometryName, materialName)
                                        .then(function(value) {
                                            console.log(`    OK | material assigned successfully`);

                                            maxscriptClient.linkToParent(geometryName, parentName)
                                                .then(function(value) {
                                                    maxscriptClient.disconnect(socket);
                                                    console.log(`    OK | linked to parent successfully`);
                                                    res.end(JSON.stringify({ id: geometryName }, null, 2));
                                                }.bind(this))
                                                .catch(function(err) {
                                                    maxscriptClient.disconnect();
                                                    console.error(`  FAIL | failed to link node to parent\n`, err);
                                                    res.status(500);
                                                    res.end(JSON.stringify({ error: "failed to link node to parent" }, null, 2));
                                                }.bind(this)); // end of maxscriptClient.linkToParent promise

                                        }.bind(this))
                                        .catch(function(err) {
                                            maxscriptClient.disconnect();
                                            console.error(`  FAIL | failed to assign material\n`, err);
                                            res.status(500);
                                            res.end(JSON.stringify({ error: "failed to assign material" }, null, 2));
                                        }.bind(this)); // end of maxscriptClient.assignMaterial promise

                                }.bind(this))
                                .catch(function(err) {
                                    maxscriptClient.disconnect();
                                    console.error(`  FAIL | failed to set node world matrix\n`, err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to set node world matrix" }, null, 2));
                                }.bind(this)); // end of maxscriptClient.setObjectWorldMatrix promise
            
                        }.bind(this))
                        .catch(function(err) {
                            console.error("SceneMeshEndpoint failed to connect to maxscript client, ", err);
                            // todo: add res.end here
                        }.bind(this)); // end of maxscriptClient.connect promise

                }.bind(this))
                .catch(function(err){
                    //todo: log error to console here
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise

        }.bind(this));

        express.put('/scene/:sceneid/mesh/:uid', async function (req, res) {
            console.log(`PUT on on /scene/${req.params.sceneid}/mesh/${req.params.uid}  with session: ${req.body.session}`);
            res.end({});
        }.bind(this));

        express.delete('/scene/:sceneid/mesh/:uid', async function (req, res) {
            console.log(`DELETE on on /scene/${req.params.sceneid}/mesh/${req.params.uid}  with session: ${req.body.session}`);
            res.end({});
        }.bind(this));
    }
}

export { SceneMeshEndpoint };