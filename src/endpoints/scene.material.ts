import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneMaterialEndpoint implements IEndpoint {
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

            let diffuseColor_r = req.body.diffuseColor_r;
            let diffuseColor_g = req.body.diffuseColor_g;
            let diffuseColor_b = req.body.diffuseColor_b;

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    let maxscriptClient = this._maxscriptClientFactory.create();
                    maxscriptClient.connect(worker.ip)
                        .then(function(value) {
                            console.log("SceneMaterialEndpoint connected to maxscript client, ", value);

                            let materialJson = {
                                name: require('../utils/genRandomName')("material"),
                                diffuseColor: [diffuseColor_r, diffuseColor_g, diffuseColor_b]
                            };

                            maxscriptClient.createStandardMaterial(materialJson)
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
                                }.bind(this)); // end of maxscriptClient.createStandardMaterial promise
            
                        }.bind(this))
                        .catch(function(err) {
                            console.error("SceneMaterialEndpoint failed to connect to maxscript client, ", err);
                        }.bind(this)); // end of maxscriptClient.connect promise

                }.bind(this))
                .catch(function(err){
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise
    
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