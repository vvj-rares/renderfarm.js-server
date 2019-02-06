import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IMaxscriptClientFactory, ISettings } from "../interfaces";
import { TYPES } from "../types";
import { JobInfo } from "../model/job_info";
import { Job } from "../database/model/job";

const http = require('http');

@injectable()
class JobEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    // private _maxscriptClientFactory: IMaxscriptClientFactory;
    /*
                @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IMaxscriptClientFactory
                this._maxscriptClientFactory = maxscriptClientFactory;
    */

    //todo: introduce job dispatcher that will control render and periodically update job info

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase) 
    {
        this._settings = settings;
        this._database = database;        
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/job`, async function (req, res) {
            // get all active jobs
            console.log(`GET on ${req.path}`);

            let jobs: Job[];
            try {
                jobs = await this._database.getActiveJobs(this._settings.current.workgroup);
            } catch (err) {
                console.log(`  FAIL | failed to get active jobs, `, err);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to get active jobs", error: err.message }, null, 2));
                return;
            }

            let jobsPayload = jobs.map( j => j.toJSON());

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "jobs", data: jobsPayload }, null, 2));
        }.bind(this));

        express.get(`/v${this._settings.majorVersion}/job/:uid`, async function (req, res) {
            console.log(`GET on ${req.path}`);

        }.bind(this));

        express.post('/job', async function (req, res) {
            console.log(`POST on ${req.path}`);

            //check that session is open => means worker is assigned and alive
            //remember apiKey from session
            //check that worker has no job assigned => reject POST saying to open another session
            //create job on worker
            //push job to job dispatcher for processing
            //return job json
    
        }.bind(this));

        express.put('/job/:uid', async function (req, res) {
            console.log(`PUT on ${req.path}`);

            //check that session is open => means worker is assigned and alive
            //get worker by guid

        }.bind(this));
    }
}

export { JobEndpoint };