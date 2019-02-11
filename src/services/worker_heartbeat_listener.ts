import { injectable, inject } from "inversify";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { IWorkerHeartbeatListener, ISettings, IWorkerObserver } from "../interfaces";
import { TYPES } from "../types";
import { Worker } from "../database/model/worker";

const uuidv4 = require('uuid/v4');
const dgram = require('dgram');

@injectable()
export class WorkerHeartbeatListener implements IWorkerHeartbeatListener, IWorkerObserver {
    private _settings: ISettings;

    private _workers: {
        [id: string]: Worker;
    } = {};

    private _vraySpawners: {
        [id: string]: VraySpawnerInfo;
    } = {};

    private _workerAddedCb: ((worker: Worker) => Promise<any>) []      = []; // array of callbacks
    private _workerUpdatedCb: ((worker: Worker) => Promise<any>) []    = [];
    private _workerOfflineCb: ((worker: Worker) => Promise<any>) []    = [];
    private _spawnerCb: ((worker: VraySpawnerInfo) => Promise<any>) [] = [];

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
    ) {
        this._settings = settings;

        this.id = Math.random();
        console.log(" >> WorkerHeartbeatListener: ", this.id);
    }

    public id: number;

    public Listen() {
        // add timer to check known workers if they're still alive
        setInterval(function() {
            let activeWorkers: {
                [id: string]: Worker;
            } = {};

            for (let i in this._workers) {
                let w = this._workers[i];
                if (Date.now() - w.lastSeen.getTime() > 3000) { // no heartbeat for more than 3 sec? dead!
                    for (let c in this._workerOfflineCb) {
                        this._workerOfflineCb[c](w);
                    }
                    // and exclude this worker from activeWorkers
                } else {
                    activeWorkers[i] = w;
                }
            }

            this._workers = activeWorkers;
        }.bind(this), 1000);

        const server = dgram.createSocket('udp4');

        server.on('error', function (err) {
            console.log(`Worker monitor error:\n${err.stack}`);
            server.close();
        }.bind(this));

        server.on('message', async function (msg, rinfo) {
            var rec = JSON.parse(msg.toString());
            // console.log(rec);
            if (rec.type === "heartbeat" && rec.sender === "remote-maxscript") {
                this.handleHeartbeatFromRemoteMaxscript(msg, rinfo, rec);
            }
            else if (rec.type === "heartbeat" && rec.sender === "worker-manager") {
                this.handleHeartbeatFromWorkerManager(msg, rinfo, rec);
            }
        }.bind(this));

        server.on('listening', function () {
            const address = server.address();
            console.log(`    OK | Worker monitor is listening on ${address.address}:${address.port}`);
        }.bind(this));

        server.bind(this._settings.current.heartbeatPort);
    }

    public Subscribe(
        workerAddedCb: (worker: Worker) => Promise<any>,
        workerUpdatedCb: (worker: Worker) => Promise<any>,
        workerOfflineCb: (worker: Worker) => Promise<any>,
        spawnerCb: (spawner: VraySpawnerInfo) => Promise<any>)
    {
        if (workerAddedCb) {
            this._workerAddedCb.push(workerAddedCb);
        }
        if (workerUpdatedCb) {
            this._workerUpdatedCb.push(workerUpdatedCb);
        }
        if (workerOfflineCb) {
            this._workerOfflineCb.push(workerOfflineCb);
        }
        if (spawnerCb) {
            this._spawnerCb.push(spawnerCb);
        }
    }

    private handleHeartbeatFromRemoteMaxscript(msg, rinfo, rec) {
        var workerId = rec.mac + rec.port;
        let knownWorker = this._workers[workerId];

        if (knownWorker !== undefined) { // update existing record
            let newLastSeen = new Date();

            knownWorker.lastSeen = newLastSeen;
            knownWorker.cpuUsage = rec.cpu_usage;
            knownWorker.ramUsage = rec.ram_usage;
            knownWorker.totalRam = rec.total_ram;

            for (let c in this._workerUpdatedCb) {
                try {
                    this._workerUpdatedCb[c](knownWorker);
                } catch (err) {
                    console.log(`  WARN | _workerUpdatedCb threw exception: `, err);
                    console.log(`       | knownWorker was: `, knownWorker);
                }
            }
        }
        else {
            // all who report into this api belongs to current workgroup
            let newWorker = new Worker(null);
            newWorker.guid = uuidv4();
            newWorker.mac = rec.mac;
            newWorker.ip = rinfo.address;
            newWorker.port = rec.port;
            newWorker.firstSeen = new Date();
            newWorker.lastSeen = new Date();
            newWorker.workgroup = this._settings.current.workgroup;
            newWorker.cpuUsage = rec.cpu_usage;
            newWorker.ramUsage = rec.ram_usage;
            newWorker.totalRam = rec.total_ram;

            this._workers[workerId] = newWorker;

            for (let c in this._workerAddedCb) {
                try {
                    this._workerAddedCb[c](newWorker);
                } catch (err) {
                    console.log(`  WARN | _workerAddedCb threw exception: `, err);
                    console.log(`       | newWorker was: `, newWorker);
                }
            }

            console.log(`    OK | new worker, ${msg} from ${rinfo.address}:${rinfo.port}`);
        }
    }

    private handleHeartbeatFromWorkerManager(msg, rinfo, rec) {
        if (!rec.vray_spawner) {
            return;
        }
        var vraySpawnerId = rec.ip + rec.mac;
        let knownVraySpawner = this._vraySpawners[vraySpawnerId];
        if (knownVraySpawner !== undefined) { // update existing record
            knownVraySpawner.cpuUsage = rec.cpu_usage;
            knownVraySpawner.ramUsage = rec.ram_usage;
            knownVraySpawner.totalRam = rec.total_ram;
            knownVraySpawner.touch();

            for (let c in this._spawnerCb) {
                try {
                    this._spawnerCb[c](knownVraySpawner);
                } catch (err) {
                    console.log(`  WARN | _spawnerCb threw exception: `, err);
                    console.log(`       | knownVraySpawner was: `, knownVraySpawner);
                }
            }
        }
        else {
            // all who report into this api belongs to current workgroup
            let newVraySpawner = new VraySpawnerInfo(rec.mac, rinfo.address, this._settings.current.workgroup);
            newVraySpawner.cpuUsage = rec.cpu_usage;
            newVraySpawner.ramUsage = rec.ram_usage;
            newVraySpawner.totalRam = rec.total_ram;
            this._vraySpawners[vraySpawnerId] = newVraySpawner;

            for (let c in this._spawnerCb) {
                try {
                    this._spawnerCb[c](newVraySpawner);
                } catch (err) {
                    console.log(`  WARN | _spawnerCb threw exception: `, err);
                    console.log(`       | newVraySpawner was: `, newVraySpawner);
                }
            }

            console.log(`new vray spawner: ${msg} from ${rinfo.address}`);
        }
    }
}

