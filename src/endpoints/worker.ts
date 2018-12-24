import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase } from "../interfaces";
import { TYPES } from "../types";
import { WorkerInfo } from "../model/worker_info";

const settings = require("../settings");

@injectable()
class WorkerEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _workers: { [id: string] : WorkerInfo; } = {};

    constructor(@inject(TYPES.IDatabase) database: IDatabase) {
        this._database = database;

        this._workers = {};

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
            console.log(msg.toString());
            var rec = JSON.parse(msg.toString());

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

        server.bind(3000);
    }

    async handleHeartbeatFromRemoteMaxscript(msg, rinfo, rec) {
        var workerId = rec.mac + rec.port;
        let knownWorker = this._workers[workerId];
        if (knownWorker !== undefined) { // update existing record
            knownWorker.cpuUsage = rec.cpu_usage;
            knownWorker.ramUsage = rec.ram_usage;
            knownWorker.totalRam = rec.total_ram;
            knownWorker.ip       = rinfo.address;
            knownWorker.port     = rec.port;
            // all who report into this api belongs to current workgroup
            knownWorker.workgroup = settings.workgroup;
            knownWorker.touch();

            await this._database.storeWorker(knownWorker);
        } else {
             // all who report into this api belongs to current workgroup
            let newWorker = new WorkerInfo(rec.mac, rinfo.address, rec.port, settings.workgroup);
            this._workers[workerId] = newWorker;

            await this._database.storeWorker(newWorker);

            console.log(`new worker: ${msg} from ${rinfo.address}:${rinfo.port}`);
        }
    }

    async handleHeartbeatFromWorkerManager(msg, rinfo, rec) {
        // console.log(" >> TODO: handle heartbeat: ", msg);
    }

    bind(express: express.Application) {
        express.get('/worker', function (req, res) {
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
                        console.log(`  FAIL | api key declined: ${apiKey}`);
                        res.status(403);
                        res.end(JSON.stringify({ error: "api key declined" }, null, 2));
                    }
                }.bind(this))
                .catch(function(err) {
                    console.log(`  FAIL | failed to check api_key: ${apiKey}, `, err);
                    res.status(500);
                    res.end(JSON.stringify({ error: "failed to check api_key" }, null, 2));
                }.bind(this));

        }.bind(this));
    }
}

export { WorkerEndpoint };