import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IJobHandler, ISettings, IDatabase, IMaxscriptClient, IMaxscriptClientFactory } from "../interfaces";
import { Job } from "../database/model/job";
import { Session } from "../database/model/session";

@injectable()
export class JobHandler implements IJobHandler {

    private _clients: {
        [jobGuid: string]: IMaxscriptClient;
    } = {};

    private _jobs: Job[] = [];

    constructor(
        @inject(TYPES.ISettings) private _settings: ISettings,
        @inject(TYPES.IDatabase) private _database: IDatabase,
        @inject(TYPES.IMaxscriptClientFactory) private _maxscriptClientFactory: IMaxscriptClientFactory,
    ) {
        this.id = Math.random();
        console.log(" >> JobHandler: ", this.id);
    }

    public id: number;

    public Start(job: Job, session: Session): void {
        this._jobs.push(job);

        this.StartJob(job).catch(function(err) {
            console.log(" >> job failed: ", err);
            let jobIdx = this._jobs.findIndex(el => el === job);
            this._jobs.splice(jobIdx, 1);
        }.bind(this));
    }

    public Cancel(job: Job): void {
        let jobIdx = this._jobs.findIndex(el => el === job);
        this._jobs.splice(jobIdx, 1);

        //todo: request Worker Manager to kill worker
    }

    private async StartJob(job: Job) {
        console.log(" >> StartJob: ", job);

        let client = this._maxscriptClientFactory.create();
        this._clients[job.guid] = client;

        console.log(" >> connecting to: " + `${job.workerRef.ip}:${job.workerRef.port}`);
        let connected = await client.connect(job.workerRef.ip, job.workerRef.port);
        console.log(" >> connected: ", connected);

        if (connected) {
            await this._database.updateJob(job, { $set: { state: "connected" } } );
        } else {
            let errorMessage = "failed to connect worker maxscript";
            await this._database.failJob(job, errorMessage);
            delete this._clients[job.guid];
            throw Error(errorMessage);
        }

        this._database.updateJob(job, { $set: { state: "rendering" } });

        let filename = job.guid + ".png";
        // todo: don't hardcode worker local temp directory
        client.renderScene("Camera001", [640, 480], "C:\\Temp\\" + filename, {})
            .then(async function(result) {
                console.log(" >> completeJob");
                await this._database.completeJob(job, [ `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${filename}` ]);
            }.bind(this))
            .catch(async function(err) {
                console.log(" >> failJob");
                await this._database.failJob(job, err.message);                
            }.bind(this));
    }
}
