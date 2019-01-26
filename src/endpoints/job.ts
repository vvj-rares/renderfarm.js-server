import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings } from "../interfaces";
import { TYPES } from "../types";
import { JobInfo } from "../model/job_info";

const http = require('http');

@injectable()
class JobEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientFactory: IMaxscriptClientFactory;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory) 
    {
        this._settings = settings;
        this._database = database;
        this._maxscriptClientFactory = maxscriptClientFactory;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/job/:uid`, async function (req, res) {
            // this resource is spammy, don't log anything
            // console.log(`GET on /job/${req.params.uid}`);

            let jobGuid = req.params.uid;

            this._database.getJob(jobGuid)
                .then(function(value){
                    let jobInfo = JobInfo.fromJSON(value);

                    // console.log(" >> updating session: ", jobInfo.sessionGuid);
                    this._database.getSession(jobInfo.sessionGuid)
                        .then(function(jobSession){

                            const request = require('request');
                            let parts = jobInfo.workerEndpoint.split(":");
                            if (parts.length <= 1) {
                                // console.error(" >> wrong jobInfo.workerEndpoint: ", jobInfo.workerEndpoint);
                                res.status(500);
                                res.end(JSON.stringify({ error: "job missing worker endpoint info" }, null, 2));
                                return;
                            }
                            let workerHost = parts[0];
                            let workerPort = parseInt(parts[1]);

                            let workerManagerUrl = `http://${workerHost}:${this._settings.current.workerManagerPort}/worker`;
                            // console.log(" >> requesting: ", workerManagerUrl);
                            request(workerManagerUrl, function (error, response, body) {
                                if (error) {
                                    console.log(" >> error: ", error);
                                    res.end(JSON.stringify(jobInfo.toJSON(), null, 2));
                                    return;
                                }
                                if (response && response.statusCode === 200) {
                                    let allWorkersDetails = JSON.parse(body);
                                    // console.log(" >> allWorkersDetails: ", allWorkersDetails);
                                    // console.log("         ? workerPort: ", workerPort);

                                    let activeWorkerDetails = allWorkersDetails.find((el) => {
                                        return el.port === workerPort;
                                    });
                                    // console.log(" >> activeWorkerDetails: ", activeWorkerDetails);

                                    if (activeWorkerDetails && activeWorkerDetails.vray_progress) {
                                        jobInfo.vrayProgress = activeWorkerDetails.vray_progress;
                                    }
                                }
                                res.end(JSON.stringify(jobInfo.toJSON(), null, 2));
                            }.bind(this)); // end of request

                        }.bind(this))
                        .catch(function(err){
                            console.log(" >> ", err);
                            res.status(404);
                            res.end(JSON.stringify({ error: "session expired" }, null, 2));
                        }.bind(this)); // end of this._database.getSession promise
                    
                }.bind(this))
                .catch(function(err){
                    console.error(`  FAIL | job not found: ${jobGuid}, `, err);
                    res.status(404);
                    res.end(JSON.stringify({ error: "job not found" }, null, 2));
                }.bind(this)); // end of this._database.getJob(jobGuid) promise

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

                    this._database.getWorker(sessionGuid)
                        .then(function(worker){

                            let camera = req.body.camera;
                            let width = req.body.width;
                            let height = req.body.height;

                            let maxscriptClient = this._maxscriptClientFactory.create();
                            maxscriptClient.connect(worker.ip, worker.port)
                                .then(function(value) {
                                    console.log("JobEndpoint connected to maxscript client, ", value);

                                    let jobInfo = new JobInfo(jobGuid, sessionGuid, worker.endpoint, worker.mac);
                                    jobInfo.rendering();

                                    //now save job in database
                                    //if it was successful, - then only start render
                                    this._database.storeJob(jobInfo)
                                        .then(function(value){
                                            const fileId = require('../utils/genRandomName')("render");
                                            const outputPath = `${this._settings.current.renderOutputDir}\\\\${fileId}.png`;

                                            this._renderingClients[ jobGuid ] = maxscriptClient;
                                            let vraySettings = {
                                                //todo: you can pass any vray settings here
                                            };
                                            maxscriptClient.renderScene(camera, [width, height], outputPath, vraySettings)
                                                .then(function(value) {
                                                    maxscriptClient.disconnect();
                                                    delete this._renderingClients[ jobGuid ];

                                                    jobInfo.url = `${this._settings.current.publicUrl}/renderoutput/${fileId}.png`;
                                                    jobInfo.success();
                                                    
                                                    this._database.storeJob(jobInfo)
                                                        .then(function(value){
                                                            console.log(`    OK | completed job saved: ${jobInfo.guid}`);
                                                        }.bind(this))
                                                        .catch(function(err){
                                                            console.error(`  FAIL | failed to save completed job, `, err);
                                                        }.bind(this)); // end of this._database.storeJob promise

                                                    console.log(`    OK | image rendered, ${value}`);
                                                }.bind(this))
                                                .catch(function(err) {
                                                    maxscriptClient.disconnect();
                                                    delete this._renderingClients[ jobGuid ];

                                                    jobInfo.fail();
                                                    
                                                    this._database.storeJob(jobInfo)
                                                        .then(function(value){
                                                            console.log(`    OK | failed job saved: ${jobInfo.guid}`);
                                                        }.bind(this))
                                                        .catch(function(err){
                                                            console.error(`  FAIL | failed to save failed job, `, err);
                                                        }.bind(this)); // end of this._database.storeJob promise

                                                    console.error(`  FAIL | failed to render image\n`, err);
                                                }.bind(this));

                                            res.end(JSON.stringify({ guid: jobGuid }, null, 2));
                                        }.bind(this))
                                        .catch(function(err){
                                            console.error(`  FAIL | failed to save new job, `, err);
                                            res.status(500);
                                            res.end(JSON.stringify({ error: "failed to save new job" }, null, 2));
                                        }.bind(this)); // end of this._database.storeJob promise

                                }.bind(this))
                                .catch(function(err) {
                                    console.error("JobEndpoint failed to connect to maxscript client, ", err);
                                    res.status(500);
                                    res.end(JSON.stringify({ error: "failed to connect to maxscript client" }, null, 2));
                                }.bind(this)); // end of maxscriptClient.connect promise

                        }.bind(this))
                        .catch(function(err){
                            console.error("this._database.getWorker promise rejected, ", err);
                            res.status(403);
                            res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                        }.bind(this)); // end of this._database.getWorker promise

                }.bind(this))
                .catch(function(err){
                    console.error("this._database.getSessionWorkspace promise rejected", err);
                    res.status(403);
                    res.end(JSON.stringify({ error: "session is expired" }, null, 2));
                }.bind(this)); // end of this._database.getSessionWorkspace promise
    
        }.bind(this));

        express.put('/job/:uid', async function (req, res) {
            console.log(`PUT on /job/${req.params.uid}`);

            let newJobStatus = req.body.status;

            if (!newJobStatus) {
                res.status(400);
                res.end(JSON.stringify({ error: `status is missing` }, null, 2));
                return;
            }

            if (newJobStatus !== JobInfo.Canceled) {
                res.status(403);
                res.end(JSON.stringify({ error: `can not update job with status ${newJobStatus}` }, null, 2));
                return;
            }

            let jobGuid = req.params.uid;

            this._database.getJob(jobGuid)
                .then(function(value){
                    let jobInfo = JobInfo.fromJSON(value);
                    if (jobInfo.status == JobInfo.Rendering) {
                        //first cancel job in database,
                        jobInfo.cancel();
                        this._database.storeJob(jobInfo)
                            .then(function(value){
                                // now kill worker of this job
                                let parts = jobInfo.workerEndpoint.split(":");
                                const data = JSON.stringify({});
                                
                                const options = {
                                    hostname: parts,
                                    port: Number.parseInt(parts[1]),
                                    path: '/worker',
                                    method: 'DELETE',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Content-Length': data.length
                                    }
                                };
                                console.log(" >> options: ", options);
                                
                                const req = http.request(options, function(resp) {
                                    console.log(` >> statusCode: ${resp.statusCode}`);
                                
                                    resp.on('data', (responseData) => {
                                        console.log(` >> responseData: `, responseData);
                                        res.end(JSON.stringify({ success: true }, null, 2));
                                    })
                                }.bind(this));
                                
                                req.on('error', function(reqError) {
                                    console.error(" >> reqError: ", reqError);
                                }.bind(this));
                                
                                req.write(data);
                                req.end();

                            }.bind(this))
                            .catch(function(err){
                                console.error(`  FAIL | cant update job ${jobInfo.guid}, `, err);
                                res.status(500);
                                res.end(JSON.stringify({ error: `can not update ${jobInfo.status} job with status ${newJobStatus}` }, null, 2));
                            }.bind(this)); // end of this._database.storeJob(jobInfo) promise
                    } else {
                        res.status(403);
                        res.end(JSON.stringify({ error: `can not update ${jobInfo.status} job with status ${newJobStatus}` }, null, 2));
                    }
                }.bind(this))
                .catch(function(err){
                    // console.error(`  FAIL | job not found: ${jobGuid}, `, err);
                    res.status(404);
                    res.end(JSON.stringify({ error: "job not found" }, null, 2));
                }.bind(this)); // end of this._database.getJob(jobGuid) promise

        }.bind(this));
    }
}

export { JobEndpoint };