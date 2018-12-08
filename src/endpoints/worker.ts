import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks } from "../interfaces";
import { TYPES } from "../types";
import { WorkerInfo } from "../model/worker_info";

@injectable()
class WorkerEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;
    private _workers: { [id: string] : WorkerInfo; } = {};

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks) {
        this._database = database;
        this._checks = checks;

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
            var rec = JSON.parse(msg.toString());
            var workerId = rec.mac + rec.port;
            let knownWorker = this._workers[workerId];
            if (knownWorker !== undefined) { // update existing record
                knownWorker.cpuUsage = rec.cpu_usage;
                knownWorker.ramUsage = rec.ram_usage;
                knownWorker.totalRam = rec.total_ram;
                knownWorker.ip       = rinfo.address;
                knownWorker.port     = rec.port;
                knownWorker.touch();

                await this._database.storeWorker(knownWorker);
            } else {
                let newWorker = new WorkerInfo(rec.mac, rinfo.address, rec.port);
                this._workers[workerId] = newWorker;

                await this._database.storeWorker(newWorker);

                console.log(`new worker: ${msg} from ${rinfo.address}:${rinfo.port}`);
            }
        }.bind(this));
        
        server.on('listening', function() {
            const address = server.address();
            console.log(`    OK | Worker monitor is listening on ${address.address}:${address.port}`);
        }.bind(this));

        server.bind(3000);
    }

    bind(express: express.Application) {
        express.get('/worker', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /worker with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKeySync(res, this._database, apiKey)) return;

            let response = Object.keys(this._workers).map(function(key, index) {
                return this._workers[key].toJSON();
            }.bind(this));
            res.end(JSON.stringify(response, null, 2));

        }.bind(this));

        express.get('/worker/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /worker/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.post('/worker', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /worker with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.put('/worker/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /worker/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.delete('/worker/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /worker/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));
    }
}

export { WorkerEndpoint };