import { injectable, inject, decorate } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, IMaxscriptClient, IMaxscriptClientFactory, IJobService } from "../interfaces";
import { Job } from "../database/model/job";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";

@injectable()
export class JobService extends EventEmitter implements IJobService {

    private _clients: {
        [jobGuid: string]: IMaxscriptClient;
    } = {};

    private _jobs: Job[] = [];

    constructor(
        @inject(TYPES.ISettings) private _settings: ISettings,
        @inject(TYPES.IDatabase) private _database: IDatabase,
        @inject(TYPES.IMaxscriptClientFactory) private _maxscriptClientFactory: IMaxscriptClientFactory,
    ) {
        super();

        this.id = Math.random();
        console.log(" >> JobService: ", this.id);
    }

    public id: number;

    public Start(job: Job): void {
        this._jobs.push(job);

        this.StartJob(job).catch(async function(err) {
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

    private async StartJob(job: Job) {
        console.log(" >> StartJob: ", job);

        let client = this._maxscriptClientFactory.create();
        this._clients[job.guid] = client;
        this.emit("job:added", job);

        console.log(" >> connecting to: " + `${job.workerRef.ip}:${job.workerRef.port}`);
        let connected = await client.connect(job.workerRef.ip, job.workerRef.port);
        console.log(" >> connected: ", connected);

        if (connected) {
            let updatedJob = await this._database.updateJob(job, { $set: { state: "connected" } } );
            this.emit("job:updated", updatedJob);
        } else {
            let errorMessage = "failed to connect worker maxscript";
            let failedJob = await this._database.failJob(job, errorMessage);
            delete this._clients[job.guid];
            this.emit("job:failed", failedJob);
            return;
        }

        let renderingJob = await this._database.updateJob(job, { $set: { state: "rendering" } });
        this.emit("job:updated", renderingJob);

        let filename = job.guid + ".png";
        // todo: don't hardcode worker local temp directory, workers must report it by heartbeat
        client.renderScene("Camera001", [640, 480], "C:\\Temp\\" + filename, {})
            .then(async function(result) {
                console.log(" >> completeJob");
                let completedJob = await this._database.completeJob(job, [ `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${filename}` ]);
                this.emit("job:completed", completedJob);
            }.bind(this))
            .catch(async function(err) {
                console.log(" >> failJob: ", err);
                let failedJob = await this._database.failJob(job, err.message);
                this.emit("job:failed", failedJob);
            }.bind(this));
    }
}
