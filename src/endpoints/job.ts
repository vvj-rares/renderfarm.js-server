import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IJobService } from "../interfaces";
import { TYPES } from "../types";
import { Job } from "../database/model/job";
import { Session } from "../database/model/session";
import { EndpointHelpers } from "../utils/endpoint_helpers";

@injectable()
class JobEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _jobService: IJobService;

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
        @inject(TYPES.IJobService) jobService: IJobService,
    ) {
        this._settings = settings;
        this._database = database;
        this._jobService = jobService;
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
            let jobGuid = req.params.uid;
            console.log(`GET on ${req.path} with job guid: ${jobGuid}`);

            let job: Job;

            try {
                job = await this._database.getJob(jobGuid);
            } catch (err) {
                console.log(`  FAIL | failed to get job: ${jobGuid}`);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to get job", error: err.message }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "jobs", data: job.toJSON() }, null, 2));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/job`, async function (req, res) {
            let sessionGuid = req.body.session_guid;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            let session: Session = await EndpointHelpers.tryGetSession(sessionGuid, this._database, res);
            if (!session) {
                return;
            }

            let activeJobs: Job[] = await this._database.getActiveJobs();
            if (activeJobs.find(el => el.workerGuid === session.workerGuid)) {
                console.log(`  FAIL | session busy: ${sessionGuid}`);
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "session busy", error: null }, null, 2));
                return;
            }

            let job = await this._database.createJob(session.apiKey, session.workerGuid);

            this._jobHandler.Start(job, session);

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "jobs", data: job.toJSON() }, null, 2));
        }.bind(this));

        express.put('/job/:uid', async function (req, res) {
            console.log(`PUT on ${req.path}`);

            //check that session is open => means worker is assigned and alive
            //get worker by guid

        }.bind(this));
    }
}

export { JobEndpoint };