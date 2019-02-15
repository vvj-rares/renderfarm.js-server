import { injectable, inject, decorate } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, IMaxscriptClient, IJobService, IFactory, IMaxscriptConnectionPool } from "../interfaces";
import { Job } from "../database/model/job";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";

@injectable()
export class JobService extends EventEmitter implements IJobService {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptConnectionPool: IMaxscriptConnectionPool;

    private _jobs: Job[] = [];

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
        @inject(TYPES.IMaxscriptConnectionPool) maxscriptConnectionPool: IMaxscriptConnectionPool,
    ) {
        super();

        this._settings = settings;
        this._database = database;
        this._maxscriptConnectionPool = maxscriptConnectionPool;

        this.id = Math.random();
        console.log(" >> JobService: ", this.id);
    }

    public id: number;

    public Start(sessionGuid: string, job: Job): void {
        this._jobs.push(job);

        this.StartJob(sessionGuid, job).catch(async function(this: JobService, err) {
            console.log(" >> job failed: ", err);
            let jobIdx = this._jobs.findIndex(el => el === job);
            this._jobs.splice(jobIdx, 1);

            let failedJob = await this._database.failJob(job, err.message);
            this.emit("job:failed", failedJob);
        }.bind(this));
    }

    public async Cancel(job: Job) {
        let jobIdx = this._jobs.findIndex(el => el === job);
        this._jobs.splice(jobIdx, 1);

        //todo: request Worker Manager to kill worker
        let canceledJob = await this._database.cancelJob(job);
        this.emit("job:canceled", canceledJob);
    }

    private async StartJob(sessionGuid: string, job: Job) {
        console.log(" >> StartJob: ", job);

        let client = this._maxscriptConnectionPool.Get(sessionGuid);
        this.emit("job:added", job);

        let renderingJob = await this._database.updateJob(job, { $set: { state: "rendering" } });
        this.emit("job:updated", renderingJob);

        let filename = job.guid + ".png";
        // todo: don't hardcode worker local temp directory, workers must report it by heartbeat
        client.renderScene("Camera001", [640, 480], "C:\\Temp\\" + filename, {})
            .then(async function(this: JobService, result) {
                console.log(" >> completeJob");
                let completedJob = await this._database.completeJob(job, [ `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${filename}` ]);
                this.emit("job:completed", completedJob);
            }.bind(this))
            .catch(async function(this: JobService, err) {
                console.log(" >> failJob: ", err);
                let failedJob = await this._database.failJob(job, err.message);
                this.emit("job:failed", failedJob);
            }.bind(this));
    }
}
