import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class JobEndpoint implements IEndpoint {
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
        express.get('/job', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /job with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.get('/job/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /job/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.post('/job', async function (req, res) {
            console.log(`POST on /job with session: ${req.body.session}`);

            this._database.getWorker(req.body.session)
                .then(function(worker){

                    let camera = req.body.camera;
                    let width = req.body.width;
                    let height = req.body.height;

                    this._maxscriptClient.connect(worker.ip)
                        .then(function(value) {
                            console.log("JobEndpoint connected to maxscript client, ", value);

                            const fileId = require('../utils/genRandomName')("render");

                            const outputPath = `C:\\\\Temp\\\\${fileId}.png`;
                            this._maxscriptClient.renderScene(camera, [width, height], outputPath)
                                .then(function(value) {
                                    console.log(`    OK | image rendered`);
                                    this._maxscriptClient.uploadPng(outputPath, "https://192.168.0.200:8000/file")
                                        .then(function(value) {
                                            this._maxscriptClient.disconnect();
                                            console.log(`    OK | rendered image uploaded`);
                                            res.end(JSON.stringify({ url: `https://192.168.0.200:8000/file/${fileId}.png` }, null, 2));
                                        }.bind(this))
                                        .catch(function(err) {
                                            this._maxscriptClient.disconnect();
                                            console.error(`  FAIL | failed to upload rendered image\n`, err);
                                            res.status(500);
                                            res.end(JSON.stringify({ error: "failed to upload rendered image" }, null, 2));
                                        }.bind(this));

                                }.bind(this))
                                .catch(function(err) {
                                    this._maxscriptClient.disconnect();
                                    console.error(`  FAIL | failed to render image\n`, err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to render image" }, null, 2));
                                }.bind(this))
            
                        }.bind(this))
                        .catch(function(err) {
                            console.error("JobEndpoint failed to connect to maxscript client, ", err);
                        }.bind(this));

                }.bind(this))
                .catch(function(err){
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getWorker promise
    
        }.bind(this));

        express.put('/job/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /job/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.delete('/job/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /job/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { JobEndpoint };