import { injectable, inject } from "inversify";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { IWorkerHeartbeatListener, ISettings } from "../interfaces";
import { TYPES } from "../types";
import { Worker } from "../database/model/worker";

const uuidv4 = require('uuid/v4');
const dgram = require('dgram');

@injectable()
export class WorkerHeartbeatListener implements IWorkerHeartbeatListener {
    private _workers: {
        [id: string]: Worker;
    } = {};

    private _vraySpawners: {
        [id: string]: VraySpawnerInfo;
    } = {};

    private _workerAddedCb: (worker: Worker) => void;
    private _workerUpdatedCb: (worker: Worker) => void;
    private _spawnerCb: (worker: VraySpawnerInfo) => void;

    private _settings: ISettings;

    constructor(@inject(TYPES.ISettings) settings: ISettings) 
    {
        this._settings = settings;
    }

    public Listen(
        workerAddedCb: (worker: Worker) => void,
        workerUpdatedCb: (worker: Worker) => void,
        spawnerCb: (spawner: VraySpawnerInfo) => void)
    {
        this._workerAddedCb = workerAddedCb;
        this._workerUpdatedCb = workerUpdatedCb;
        this._spawnerCb = spawnerCb;

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

    private handleHeartbeatFromRemoteMaxscript(msg, rinfo, rec) {
        var workerId = rec.mac + rec.port;
        let knownWorker = this._workers[workerId];

        if (knownWorker !== undefined) { // update existing record
            knownWorker.lastSeen = new Date();
            knownWorker.cpuUsage = rec.cpu_usage;
            knownWorker.ramUsage = rec.ram_usage;
            knownWorker.totalRam = rec.total_ram;

            if (this._workerUpdatedCb) {
                this._workerUpdatedCb(knownWorker);
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

            if (this._workerAddedCb) {
                this._workerAddedCb(newWorker);
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

            if (this._spawnerCb) {
                this._spawnerCb(knownVraySpawner);
            }
        }
        else {
            // all who report into this api belongs to current workgroup
            let newVraySpawner = new VraySpawnerInfo(rec.mac, rinfo.address, this._settings.current.workgroup);
            newVraySpawner.cpuUsage = rec.cpu_usage;
            newVraySpawner.ramUsage = rec.ram_usage;
            newVraySpawner.totalRam = rec.total_ram;
            this._vraySpawners[vraySpawnerId] = newVraySpawner;

            if (this._spawnerCb) {
                this._spawnerCb(newVraySpawner);
            }

            console.log(`new vray spawner: ${msg} from ${rinfo.address}`);
        }
    }
}
