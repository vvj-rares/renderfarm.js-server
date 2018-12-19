import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";
import { JobInfo } from "../model/job_info";

const settings = require("../settings");

@injectable()
class JobEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;
    private _renderingClients: { [jobGuid: string] : IMaxscriptClient } = {};

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) {
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get('/job/:uid', async function (req, res) {
            console.log(`GET on /job/${req.params.uid} with session: ${req.body.session}`);
            //todo: let clients get current job info
            res.end({});
        }.bind(this));

        express.post('/job', async function (req, res) {
            console.log(`POST on /job with session: ${req.body.session}`);

            let sessionGuid = req.body.session;

            const uuidv4 = require('uuid/v4');
            let jobGuid = uuidv4();

            this._database.getSessionWorkspace(sessionGuid)
                .then(function(workspaceInfo){
                    console.log(`    OK | retrieved workspace by session`);

                    console.log(workspaceInfo);

                    this._database.getWorker(req.body.session)
                    .then(function(worker){

                        let camera = req.body.camera;
                        let width = req.body.width;
                        let height = req.body.height;

                        let maxscriptClient = this._maxscriptClientFactory.create();
                        maxscriptClient.connect(worker.ip, worker.port)
                            .then(function(value) {
                                console.log("JobEndpoint connected to maxscript client, ", value);

                                //todo: now save job in database
                                // if it was successful, - start render

                                const fileId = require('../utils/genRandomName')("render");
                                const outputPath = `${settings.renderOutputDir}\\\\${fileId}.png`;

                                this._renderingClients[ jobGuid ] = maxscriptClient;
                                maxscriptClient.renderScene(camera, [width, height], outputPath)
                                    .then(function(value) {
                                        maxscriptClient.disconnect();
                                        // todo: remove from rendering clients
                                        // todo: update job in database

                                        console.log(`    OK | image rendered, ${value}`);
                                        // res.end(JSON.stringify({ url: `https://${settings.host}:${settings.port}/renderoutput/${fileId}.png` }, null, 2));
                                    }.bind(this))
                                    .catch(function(err) {
                                        maxscriptClient.disconnect();
                                        // todo: remove from rendering clients
                                        // todo: update job in database

                                        console.error(`  FAIL | failed to render image\n`, err);
                                        // res.status(500);
                                        // res.end(JSON.stringify({ error: "failed to render image" }, null, 2));
                                    }.bind(this));
                                
                                res.end(JSON.stringify({ guid: jobGuid }, null, 2));

                            }.bind(this))
                            .catch(function(err) {
                                console.error("JobEndpoint failed to connect to maxscript client, ", err);
                                res.status(500);
                                res.end(JSON.stringify({ error: "failed to connect to maxscript client" }, null, 2));
                            }.bind(this));

                    }.bind(this))
                    .catch(function(err){
                        console.error("this._database.getWorker promise rejected, ", err);
                        res.status(403);
                        res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                    }.bind(this)); // end of this._database.getWorker promise

                }.bind(this))
                .catch(function(err){
                    console.error("this._database.getSessionWorkspace promise rejected", err);
                    res.status(500);
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getSessionWorkspace promise
    
        }.bind(this));

        express.put('/job/:uid', async function (req, res) {
            console.log(`PUT on /job/${req.params.uid} with session: ${req.body.session}`);
            //todo: let clients cancel jobs
            res.end({});
        }.bind(this));
    }
}

export { JobEndpoint };