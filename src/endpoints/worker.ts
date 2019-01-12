import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IWorkerHeartbeatListener, ISettings } from "../interfaces";
import { TYPES } from "../types";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { Worker } from "../database/model/worker";

@injectable()
export class WorkerEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _workerHeartbeatListener: IWorkerHeartbeatListener;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IWorkerHeartbeatListener) workerHeartbeatListener: IWorkerHeartbeatListener ) 
    {
        this._settings = settings;
        this._database = database;
        this._workerHeartbeatListener = workerHeartbeatListener;

        //delete dead workers by timer
        if (this._settings.current.deleteDeadWorkers) {
            setInterval(this.tryDeleteDeadWorkers.bind(this), 5*1000); // check once per 5 sec
        }

        this._workerHeartbeatListener.Listen( this.onWorkerUpdate.bind(this), this.onSpawnerUpdate.bind(this) );
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/worker`, async function (req, res) {
            console.log(`GET on ${req.path} with api key: ${req.query.api_key}`);
            try {
                await this._database.getApiKey(req.query.api_key);
            }
            catch (err) {
                res.status(403);
                res.end(JSON.stringify({ ok: false, message: "api key rejected", error: err }, null, 2));
                return;
            }

            try {
                let workers = await this._database.getAvailableWorkers();
                res.end(JSON.stringify({ ok: true, type: "worker", data: workers }, null, 2));
            } catch (err) {
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to get workers", error: err }, null, 2));
                return;
            }
        }.bind(this));
    }

    private onWorkerUpdate(worker: Worker) {
        this._database.updateWorker(
            worker, 
            { $set: { 
                lastSeen: new Date(),
                cpuUsage: worker.cpuUsage,
                ramUsage: worker.ramUsage
            } });
    }

    private onSpawnerUpdate(spawner: VraySpawnerInfo) {
        // this._database.storeVraySpawner(spawner);
    }

    private async tryDeleteDeadWorkers() {
        this._database.deleteDeadWorkers()
            .then(function(deletedCount: number){
                if (deletedCount > 0) {
                    console.log(`    OK | deleted dead workers: ${deletedCount}`);
                }
            }.bind(this))
            .catch(function(err){
                console.error(`  FAIL | failed to delete dead workers: `, err);
            }.bind(this));
    }
}
