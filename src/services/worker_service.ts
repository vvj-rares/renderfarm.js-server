import { injectable, inject, decorate } from "inversify";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { ISettings, IWorkerService } from "../interfaces";
import { TYPES } from "../types";
import { Worker } from "../database/model/worker";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";
decorate(injectable(), EventEmitter)

const uuidv4 = require('uuid/v4');
const dgram = require('dgram');

@injectable()
export class WorkerService extends EventEmitter implements IWorkerService {
    private _settings: ISettings;

    private _workers: {
        [id: string]: Worker;
    } = {};

    private _vraySpawners: {
        [id: string]: VraySpawnerInfo;
    } = {};

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
    ) {
        super();

        this._settings = settings;

        this.id = Math.random();
        console.log(" >> WorkerService: ", this.id);

        if (this._settings.current.heartbeatPort > 0) {
            console.log(`heartbeatPort: ${this._settings.current.heartbeatPort}`);
            this.StartListener( this._settings.current.heartbeatPort );
            this.StartWorkerWatchdogTimer(this._settings.current.workerTimeoutSeconds)
        } else {
            console.log(`heartbeatPort is ${this._settings.current.heartbeatPort}, this instance will not accept worker heartbeats`);
        }
    }

    public id: number;
    private listenerRetryCount: number;

    private StartListener(port: number) {
        const server = dgram.createSocket('udp4');

        server.on('error', function (err) {
            console.error(`Worker monitor error: ${err.message}\r\n`, err);
            server.close();

            ++ this.listenerRetryCount;
            if (this.listenerRetryCount < 100) {
                console.log(`listenerRetryCount: ${this.listenerRetryCount}`);
                setTimeout(function() {
                    this.StartListener(port);
                }.bind(this), 250);
            } else if (this.listenerRetryCount === 100) {
                console.log(`Limit reached! listenerRetryCount: ${this.listenerRetryCount}`);
            }
        }.bind(this));

        server.on('message', async function (msg, rinfo) {
            let rec: any;
            let msgStr = msg.toString();
            try {
                rec = JSON.parse(msgStr);
            } catch (err) {
                console.error(`Can't parse: ${msgStr}`);
                console.error(err);
                return;
            }

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

        server.bind(port);
    }

    private StartWorkerWatchdogTimer(workerTimeoutSeconds: number) {
        // add timer to check known workers if they're still alive
        setInterval(function() {
            let activeWorkers: {
                [id: string]: Worker;
            } = {};

            for (let i in this._workers) {
                let w = this._workers[i];
                if (Date.now() - w.lastSeen.getTime() > workerTimeoutSeconds * 1000) { // no heartbeat for more than 3 sec? dead!
                    this.emit("worker:offline", w);
                } else {
                    activeWorkers[i] = w;
                }
            }

            this._workers = activeWorkers;
        }.bind(this), 1000);
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

            this.emit("worker:updated", knownWorker);
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

            this.emit("worker:added", newWorker);

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

            this.emit("spawner:updated", knownVraySpawner);
        }
        else {
            // all who report into this api belongs to current workgroup
            let newVraySpawner = new VraySpawnerInfo(rec.mac, rinfo.address, this._settings.current.workgroup);
            newVraySpawner.cpuUsage = rec.cpu_usage;
            newVraySpawner.ramUsage = rec.ram_usage;
            newVraySpawner.totalRam = rec.total_ram;
            this._vraySpawners[vraySpawnerId] = newVraySpawner;

            this.emit("spawner:added", newVraySpawner);

            console.log(`new vray spawner: ${msg} from ${rinfo.address}`);
        }
    }
}

