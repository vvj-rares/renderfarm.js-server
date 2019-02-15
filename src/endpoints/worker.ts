import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, ISettings, IWorkerService, ISessionService } from "../interfaces";
import { TYPES } from "../types";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { Worker } from "../database/model/worker";
import { Session } from "inspector";

@injectable()
export class WorkerEndpoint implements IEndpoint {
    private _settings: ISettings;
    private _database: IDatabase;
    private _workerService: IWorkerService;
    private _sessionService: ISessionService;

    constructor(@inject(TYPES.ISettings) settings: ISettings,
                @inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IWorkerService) workerService: IWorkerService,
                @inject(TYPES.ISessionService) sessionService: ISessionService,
    ) {
        this._settings = settings;
        this._database = database;
        this._workerService = workerService;
        this._sessionService = sessionService;

        this._workerService.on("worker:added", this.onWorkerAdded.bind(this));
        this._workerService.on("worker:updated", this.onWorkerUpdated.bind(this));
        this._workerService.on("worker:offline", this.onWorkerOffline.bind(this));;

        this._workerService.on("spawner:added", this.onSpawnerAdded.bind(this));
        this._workerService.on("spawner:updated", this.onSpawnerUpdated.bind(this));

        this._sessionService.on("session:expired", this.onSessionExpired.bind(this));
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/worker/:uid`, async function (this: WorkerEndpoint, req, res) {
            let workerGuid = req.params.uid;
            console.log(`GET on ${req.path}`);

            let worker: Worker;
            try {
                worker = await this._database.getWorker(workerGuid);
                if (!worker) {
                    console.log(`  FAIL | worker not found: ${workerGuid}`);
                    res.status(404);
                    res.end(JSON.stringify({ ok: false, message: "worker not found", error: null }, null, 2));
                    return;
                }
            } catch (err) {
                console.log(`  FAIL | failed to get worker: ${workerGuid}`);
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to get worker", error: err.message }, null, 2));
                return;
            }

            res.status(200);
            res.end(JSON.stringify({ ok: true, type: "worker", data: worker.toJSON() }, null, 2));

        }.bind(this));

        express.get(`/v${this._settings.majorVersion}/worker`, async function (this: WorkerEndpoint, req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on ${req.path} with api_key: ${apiKey}`);

            if (!apiKey) {
                console.log(`REJECT | api_key empty`);
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "api_key is missing", error: {} }, null, 2));
                return;
            }

            try {
                await this._database.getApiKey(apiKey);
            }
            catch (err) {
                res.status(403);
                res.end(JSON.stringify({ ok: false, message: "api_key rejected", error: err.message }, null, 2));
                return;
            }

            try {
                let workers = await this._database.getAvailableWorkers();
                res.end(JSON.stringify({ ok: true, type: "worker", data: workers }, null, 2));
            } catch (err) {
                res.status(500);
                res.end(JSON.stringify({ ok: false, message: "failed to get workers", error: err.message }, null, 2));
                return;
            }
        }.bind(this));
    }

    private async onWorkerAdded(worker: Worker) {
        try {
            await this._database.upsertWorker(worker);
        } catch (err) {
            console.error("failed to insert worker in database: ", err);
        }
    }

    private async onWorkerUpdated(worker: Worker)
    {
        try {
            //note, don't upsert here, because
            await this._database.updateWorker(
                worker,
                {
                    $set: {
                        lastSeen: new Date(),
                        cpuUsage: worker.cpuUsage,
                        ramUsage: worker.ramUsage
                    }
                });
        } catch (err) {
            console.error("failed to update worker in database: ", err);
        }
    }

    private async onWorkerOffline(worker: Worker) {
        console.log(" >> todo: // handle worker offline: ", worker);

        try {
            // let deletedWorker = await this._database.deleteWorker(worker);
            // console.log(" >> deletedWorker: ", deletedWorker);
        } catch (err) {
            // console.error("failed to delete dead worker from database: ", err);
        }
    }

    private onSpawnerAdded(spawner: VraySpawnerInfo) {
        // this._database.storeVraySpawner(spawner);
        console.log(" >> todo: // handle spawner added: ", spawner);
    }

    private onSpawnerUpdated(spawner: VraySpawnerInfo) {
        // this._database.storeVraySpawner(spawner);
        console.log(" >> todo: // handle spawner update: ", spawner);
    }

    private onSessionExpired(session: Session) {
        console.log(" >> todo: // kill running worker for expired session: ", session);
    }
}
