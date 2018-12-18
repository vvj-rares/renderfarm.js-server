import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory } from "../interfaces";
import { TYPES } from "../types";

const settings = require("../settings");

@injectable()
class JobEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

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

                                const fileId = require('../utils/genRandomName')("render");

                                const outputPath = `${settings.renderOutputDir}\\\\${fileId}.png`;
                                maxscriptClient.renderScene(camera, [width, height], outputPath)
                                    .then(function(value) {
                                        console.log(`    OK | image rendered`);
                                        maxscriptClient.disconnect();
                                        res.end(JSON.stringify({ url: `https://${settings.host}/renderoutput/${fileId}.png` }, null, 2));

                                    }.bind(this))
                                    .catch(function(err) {
                                        maxscriptClient.disconnect();
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

                }.bind(this))
                .catch(function(err){

                }.bind(this));
    
        }.bind(this));

        express.put('/job/:uid', async function (req, res) {
            console.log(`PUT on /job/${req.params.uid} with session: ${req.body.session}`);
            //todo: let clients cancel jobs
            res.end({});
        }.bind(this));
    }
}

export { JobEndpoint };