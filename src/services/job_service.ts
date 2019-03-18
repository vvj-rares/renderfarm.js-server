import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, IJobService, ISessionPool, IMaxscriptClient, IBakeTexturesFilenames, IGeometryCache, IMaxInstanceInfo } from "../interfaces";
import { Job } from "../database/model/job";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";
import { Session } from "../database/model/session";

@injectable()
export class JobService extends EventEmitter implements IJobService {
    private _settings: ISettings;
    private _database: IDatabase;
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;
    private _geometryCachePool: ISessionPool<IGeometryCache>;

    private _jobs: Job[] = [];

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
        @inject(TYPES.IGeometryCachePool) geometryCachePool: ISessionPool<IGeometryCache>,
    ) {
        super();

        this._settings = settings;
        this._database = database;
        this._maxscriptClientPool = maxscriptClientPool;
        this._geometryCachePool = geometryCachePool;

        this.id = Math.random();
        console.log(" >> JobService: ", this.id);
    }

    public id: number;

    public Start(session: Session, job: Job): void {
        this._jobs.push(job);

        this.StartJob(session, job).catch(async function(this: JobService, err) {
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

    private async StartJob(session: Session, job: Job) {
        console.log(" >> StartJob: ", job);

        let client = await this._maxscriptClientPool.Get(session);
        this.emit("job:added", job);

        let renderingJob = await this._database.updateJob(job, { $set: { state: "rendering" } });
        this.emit("job:updated", renderingJob);

        if (job.cameraName) {
            let filename = job.guid + ".png";
            // todo: don't hardcode worker local temp directory, workers must report it by heartbeat
            client.renderScene(job.cameraName, [job.renderWidth, job.renderHeight], "C:\\Temp\\" + filename, job.renderSettings)
                .then(async function(this: JobService, result) {
                    console.log(" >> completeJob, ", result);
                    let completedJob = await this._database.completeJob(job, [ `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${filename}` ]);
                    this.emit("job:completed", completedJob);
                }.bind(this))
                .catch(async function(this: JobService, err) {
                    console.log(" >> failJob: ", err);
                    let failedJob = await this._database.failJob(job, err.message);
                    this.emit("job:failed", failedJob);
                }.bind(this));
        } else if (job.bakeMeshUuid) {

            let cache = await this._geometryCachePool.Get(session);

            let maxInstanceInfo: IMaxInstanceInfo;
            let keys = Object.keys(cache.Geometries);
            console.log(" >> geometry cache keys: " + JSON.stringify(keys));
            for (let key in keys) {
                let geomBinding = cache.Geometries[key];
                if (geomBinding) {
                    maxInstanceInfo = geomBinding.MaxInstances.find(el => el.MeshUuid === job.bakeMeshUuid);
                    if (maxInstanceInfo) break;
                } else {
                    console.log(`    WARN! cache.Geometries[${key}] is not truthy`);
                }
            }
            if (!maxInstanceInfo) {
                throw Error("unable to find max object name for mesh with uuid: " + job.bakeMeshUuid);
            }

            let filenames: IBakeTexturesFilenames = {
                lightmap: job.guid + "_VRayLightingMap.png",
                shadowmap: job.guid + "_VRayRawShadowMap.png"
            };

            client.bakeTextures(maxInstanceInfo.MaxName, job.renderWidth, filenames, job.renderSettings)
                .then(async function(this: JobService, result) {
                    console.log(" >> completeJob, ", result);
                    let completedJob = await this._database.completeJob(
                        job, 
                        [
                            `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${filenames.lightmap}`,
                            `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${filenames.shadowmap}`
                        ]);
                    this.emit("job:completed", completedJob);
                }.bind(this))
                .catch(async function(this: JobService, err) {
                    console.log(" >> failJob: ", err);
                    let failedJob = await this._database.failJob(job, err.message);
                    this.emit("job:failed", failedJob);
                }.bind(this));
        } else {
            throw Error("job must have either .cameraName or .bakeObjectName");
        }
    }
}
