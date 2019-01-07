import { injectable } from "inversify";
import { WorkerInfo } from "../model/worker_info";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { IWorkerHeartbeatListener } from "../interfaces";

const settings = require("../settings");

@injectable()
export class WorkerHeartbeatListener implements IWorkerHeartbeatListener {
    private _workers: {
        [id: string]: WorkerInfo;
    } = {};

    private _vraySpawners: {
        [id: string]: VraySpawnerInfo;
    } = {};

    private _workerCb: (worker: WorkerInfo) => void;
    private _spawnerCb: (worker: VraySpawnerInfo) => void;

    public Listen(workerCb: (worker: WorkerInfo) => void, spawnerCb: (spawner: VraySpawnerInfo) => void) {
        this._workerCb = workerCb;
        this._spawnerCb = spawnerCb;
        const dgram = require('dgram');
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
        server.bind(settings.heartbeatPort);
    }

    private handleHeartbeatFromRemoteMaxscript(msg, rinfo, rec) {
        var workerId = rec.mac + rec.port;
        let knownWorker = this._workers[workerId];
        if (knownWorker !== undefined) { // update existing record
            knownWorker.cpuUsage = rec.cpu_usage;
            knownWorker.ramUsage = rec.ram_usage;
            knownWorker.totalRam = rec.total_ram;
            knownWorker.touch();

            if (this._workerCb) {
                this._workerCb(knownWorker);
            }
        }
        else {
            // all who report into this api belongs to current workgroup
            let newWorker = new WorkerInfo(rec.mac, rinfo.address, rec.port, settings.workgroup);
            newWorker.cpuUsage = rec.cpu_usage;
            newWorker.ramUsage = rec.ram_usage;
            newWorker.totalRam = rec.total_ram;
            this._workers[workerId] = newWorker;

            if (this._workerCb) {
                this._workerCb(newWorker);
            }

            console.log(`new worker: ${msg} from ${rinfo.address}:${rinfo.port}`);
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
            let newVraySpawner = new VraySpawnerInfo(rec.mac, rinfo.address, settings.workgroup);
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
