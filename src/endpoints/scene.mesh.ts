import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class SceneMeshEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;
    private _maxscriptClient: IMaxscriptClient;

    private _meshes: any[] = [];

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks,
                @inject(TYPES.IMaxscriptClient) maxscriptClient: IMaxscriptClient) {
        this._database = database;
        this._checks = checks;
        this._maxscriptClient = maxscriptClient;
    }

    bind(express: express.Application) {
        express.get('/scene/mesh', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/mesh with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.get('/scene/mesh/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /scene/mesh/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(this._meshes[req.params.uid]);
        }.bind(this));

        express.post('/scene/mesh', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /scene/mesh with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            const LZString = require("lz-string");
            let sceneJsonText = LZString.decompressFromBase64(req.body.scene_data);

            const meshId = require('../utils/genRandomName')("mesh");
            this._meshes[meshId] = sceneJsonText;

            // now let maxscript request mesh from me
            this._maxscriptClient.connect("192.168.0.150")
                .then(function(value) {
                    console.log("SceneMeshEndpoint connected to maxscript client, ", value);

                    let filename = `${meshId}.json`;
                    this._maxscriptClient.downloadJson(`https://192.168.0.200:8000/scene/mesh/${meshId}?api_key=${apiKey}`, `C:\\\\Temp\\\\downloads\\\\${filename}`)
                        .then(function(value) {
                            // as we have json file saved locally, now it is the time to import it
                            console.log(`    OK | json file downloaded successfully`);
                            this._maxscriptClient.importMesh(`C:\\\\Temp\\\\downloads\\\\${filename}`, `${meshId}`)
                                .then(function(value) {
                                    this._maxscriptClient.disconnect();
                                    console.log(`    OK | mesh imported successfully`);
                                    res.end(JSON.stringify({ id: `${meshId}` }, null, 2));
                                }.bind(this))
                                .catch(function(err) {
                                    this._maxscriptClient.disconnect();
                                    console.error(`  FAIL | failed to import mesh\n`, err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to import mesh" }, null, 2));
                                }.bind(this));
                        }.bind(this))
                        .catch(function(err) {
                            this._maxscriptClient.disconnect();
                            console.error(`  FAIL | failed to download json file\n`, err);
                            res.status(500);
                            res.end(JSON.stringify({ error: "failed to download json file" }, null, 2));
                        }.bind(this))
    
                }.bind(this))
                .catch(function(err) {
                    console.error("SceneMeshEndpoint failed to connect to maxscript client, ", err);
                }.bind(this));

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