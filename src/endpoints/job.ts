import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IJobService, ISessionService } from "../interfaces";
import { TYPES } from "../types";
import { Job } from "../database/model/job";
import { Session } from "../database/model/session";

@injectable()
class JobEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _jobService: IJobService;
    private _sessionService: ISessionService;

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
        @inject(TYPES.IJobService) jobService: IJobService,
        @inject(TYPES.ISessionService) sessionService: ISessionService,
    ) {
        this._settings = settings;
        this._database = database;
        this._jobService = jobService;
        this._sessionService = sessionService;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/job`, async function (this: JobEndpoint, req: express.Request, res: express.Response) {
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

        express.get(`/v${this._settings.majorVersion}/job/:uid`, async function (this: JobEndpoint, req: express.Request, res: express.Response) {
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

            this._sessionService.KeepSessionAlive(job.workerRef.sessionGuid);

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "jobs", data: job.toJSON() }, null, 2));
        }.bind(this));

        express.post(`/v${this._settings.majorVersion}/job`, async function (this: JobEndpoint, req: express.Request, res: express.Response) {
            let sessionGuid = req.body.session_guid;
            console.log(`POST on ${req.path} with session: ${sessionGuid}`);

            let cameraName = req.body.camera_name;
            if (!cameraName) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing camera_name", error: null }, null, 2));
                return;
            }

            let renderWidth = req.body.render_width;
            if (!renderWidth) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing render_width", error: null }, null, 2));
                return;
            }

            let renderHeight = req.body.render_height;
            if (!renderHeight) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing render_height", error: null }, null, 2));
                return;
            }

            let session: Session = await this._sessionService.GetSession(sessionGuid, false, false, true);
            if (!session) {
                return;
            }

            let activeJobs: Job[] = await this._database.getActiveJobs(this._settings.current)
            if (activeJobs.find(el => el.workerGuid === session.workerGuid)) {
                console.log(`  FAIL | session busy: ${sessionGuid}`);
                res.status(404);
                res.end(JSON.stringify({ ok: false, message: "session busy", error: null }, null, 2));
                return;
            }

            let job = await this._database.createJob(session.apiKey, session.workerGuid, cameraName, renderWidth, renderHeight);

            this._jobService.Start(session, job);

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "jobs", data: job.toJSON() }, null, 2));
        }.bind(this));

        express.put('/job/:uid', async function (this: JobEndpoint, req: express.Request, res: express.Response) {
            console.log(`PUT on ${req.path}`);

            //check that session is open => means worker is assigned and alive
            //get worker by guid

        }.bind(this));
    }
}

export { JobEndpoint };