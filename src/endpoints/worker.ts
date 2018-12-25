import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase } from "../interfaces";
import { TYPES } from "../types";
import { WorkerInfo } from "../model/worker_info";
import { VraySpawnerInfo } from "../model/vray_spawner_info";

const settings = require("../settings");
const majorVersion = settings.version.split(".")[0];

@injectable()
class WorkerEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _workers: { [id: string] : WorkerInfo; } = {};
    private _vraySpawners: { [id: string] : VraySpawnerInfo; } = {};

    constructor(@inject(TYPES.IDatabase) database: IDatabase) {
        this._database = database;

        this._workers = {};

        //delete dead workers by timer
        setInterval(async function() {
            this._database.deleteDeadWorkers()
                .then(function(deletedCount){
                    if (deletedCount > 0) {
                        console.log(`    OK | deleted dead workers: ${deletedCount}`);
                    } else {
                        console.log(`  INFO | deleted dead workers: ${deletedCount}`);
                    }
                }.bind(this))
                .catch(function(err){
                    console.error(`  FAIL | failed to delete dead workers: `, err);
                }.bind(this));

        }.bind(this), 30*1000); // check once per 30 sec

        this.listen();
    }

    listen() {
        const dgram = require('dgram');
        const server = dgram.createSocket('udp4');

        server.on('error', function(err) {
            console.log(`server error:\n${err.stack}`);
            server.close();
        }.bind(this));

        server.on('message', async function(msg, rinfo) {
            var rec = JSON.parse(msg.toString());
            // console.log(rec);

            if (rec.type === "heartbeat" && rec.sender === "remote-maxscript") {
                this.handleHeartbeatFromRemoteMaxscript(msg, rinfo, rec);
            } else if (rec.type === "heartbeat" && rec.sender === "worker-manager") {
                this.handleHeartbeatFromWorkerManager(msg, rinfo, rec);
            }
        }.bind(this));

        server.on('listening', function() {
            const address = server.address();
            console.log(`    OK | Worker monitor is listening on ${address.address}:${address.port}`);
        }.bind(this));

        server.bind(settings.heartbeatPort);
    }

    async handleHeartbeatFromRemoteMaxscript(msg, rinfo, rec) {
        var workerId = rec.mac + rec.port;
        let knownWorker = this._workers[workerId];
        if (knownWorker !== undefined) { // update existing record
            knownWorker.cpuUsage = rec.cpu_usage;
            knownWorker.ramUsage = rec.ram_usage;
            knownWorker.totalRam = rec.total_ram;
            knownWorker.touch();

            await this._database.storeWorker(knownWorker);
        } else {
             // all who report into this api belongs to current workgroup
            let newWorker = new WorkerInfo(rec.mac, rinfo.address, rec.port, settings.workgroup);
            newWorker.cpuUsage = rec.cpu_usage;
            newWorker.ramUsage = rec.ram_usage;
            newWorker.totalRam = rec.total_ram;
            this._workers[workerId] = newWorker;

            await this._database.storeWorker(newWorker);

            console.log(`new worker: ${msg} from ${rinfo.address}:${rinfo.port}`);
        }
    }

    async handleHeartbeatFromWorkerManager(msg, rinfo, rec) {
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

            await this._database.storeVraySpawner(knownVraySpawner);
        } else {
             // all who report into this api belongs to current workgroup
            let newVraySpawner = new VraySpawnerInfo(rec.mac, rinfo.address, settings.workgroup);
            newVraySpawner.cpuUsage = rec.cpu_usage;
            newVraySpawner.ramUsage = rec.ram_usage;
            newVraySpawner.totalRam = rec.total_ram;
            this._vraySpawners[vraySpawnerId] = newVraySpawner;

            await this._database.storeVraySpawner(newVraySpawner);

            console.log(`new vray spawner: ${msg} from ${rinfo.address}`);
        }
    }

    bind(express: express.Application) {
        express.get(`/v${majorVersion}/worker`, function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /worker with api_key: ${apiKey}`);
            this._database.getApiKey(apiKey)
                .then(function(apiKeyRec) {
                    if (apiKeyRec.value) {
                        let response = Object.keys(this._workers).map(function(key, index) {
                            return this._workers[key].toJSON();
                        }.bind(this));
                        console.log(`    OK | api_key ${apiKey} accepted`);
                        res.end(JSON.stringify(response, null, 2));
                    } else {
                        console.error(`  FAIL | api key declined: ${apiKey}`);
                        res.status(403);
                        res.end(JSON.stringify({ error: "api key declined" }, null, 2));
                    }
                }.bind(this))
                .catch(function(err) {
                    console.error(`  FAIL | failed to check api_key: ${apiKey}, `, err);
                    res.status(500);
                    res.end(JSON.stringify({ error: "failed to check api_key" }, null, 2));
                }.bind(this));

        }.bind(this));
    }
}

export { WorkerEndpoint };