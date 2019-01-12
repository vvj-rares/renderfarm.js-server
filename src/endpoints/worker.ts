import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IWorkerHeartbeatListener, ISettings } from "../interfaces";
import { TYPES } from "../types";
import { isString } from "util";
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
        express.get(`/v${this._settings.majorVersion}/worker`, function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on ${req.path} with api key: ${apiKey}`);
            this._database.getApiKey(apiKey)
                .then(function() {
                    let response = Object.keys(this._workers).map(function(key) {
                        return this._workers[key].toJSON();
                    }.bind(this));
                    console.log(`    OK | api key ${apiKey} accepted`);
                    res.end(JSON.stringify(response, null, 2));
                }.bind(this))
                .catch(function(err) {
                    let errorText = "failed to check api key";
                    console.error(`  FAIL | ${errorText}: ${apiKey}, `, err);
                    res.status(500);
                    res.end(JSON.stringify({ error: ( isString(err) ? err : errorText ) }));
                }.bind(this));
        }.bind(this));
    }

    private onWorkerUpdate(worker: Worker) {
        this._database.storeWorker(worker);
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
