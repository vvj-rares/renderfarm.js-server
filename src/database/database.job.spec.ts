import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";
import { JasmineSpecHelpers } from "../jasmine.helpers";
import { Job } from "./model/job";
import { isArray } from "util";

require("../jasmine.config")();
const uuidv4 = require('uuid/v4');

describe("Database Job", function() {
    var originalTimeout;

    var settings: Settings;
    var database: Database;
    var helpers: JasmineSpecHelpers;

    describe("read-only test", function() {
        beforeEach(async function() {
            settings = new Settings("test");
            database = new Database(settings);
            helpers = new JasmineSpecHelpers(database, settings);
            try {
                await database.connect();
            } catch (err) {
                console.log(`beforeEach failed with error: ${err.message}`);
            }
        });
    
        afterEach(async function() {
            try {
                await database.disconnect();
            } catch (err) {
                console.log(`afterEach failed with error: ${err.message}`);
            }
        })

        it("checks existing job", async function(done) {
            let job: Job = await database.getJob(helpers.existingJobGuid);

            console.log("checking job: ", job);

            expect(job).toBeTruthy();
            expect(job.guid).toBe(helpers.existingJobGuid);
            expect(job.apiKey).toBe(helpers.existingApiKey);

            expect(job.createdAt).toEqual(new Date("2000-01-01 00:00:00.000"));
            expect(job.updatedAt).toEqual(new Date("2000-01-01 00:00:00.000"));
            expect(job.closedAt).toBeNull();
            expect(job.workerGuid).toBe(helpers.existingWorkerGuid);
            expect(job.state).toBe("pending");
            expect(job.closed).toBeNull();
            expect(job.canceled).toBeNull();
            expect(job.failed).toBeNull();
            expect(isArray(job.urls)).toBeTruthy()

            expect(job.workerRef).toBeTruthy();
            expect(job.workerRef.guid).toBe(helpers.existingWorkerGuid);
            expect(job.workerRef.mac).toBe("001122334455");
            expect(job.workerRef.ip).toBe("192.168.88.100");
            expect(job.workerRef.port).toBe(34092);
            expect(job.workerRef.endpoint).toBe("192.168.88.100:34092");
            expect(job.workerRef.workgroup).toBe("default");
            expect(job.workerRef.firstSeen).toEqual(new Date("1999-12-31T23:00:00.000Z"));
            expect(job.workerRef.lastSeen).toEqual(new Date("1999-12-31T23:00:00.000Z"));
            expect(job.workerRef.cpuUsage).toBe(0.19);
            expect(job.workerRef.ramUsage).toBe(0.51);
            expect(job.workerRef.totalRam).toBe(15.9);
            expect(job.workerRef.sessionGuid).toBe(helpers.existingSessionGuid);

            done();
        });
    }); // end of read-only tests

    /* describe("write test", function() {
        var collectionPrefix: string;

        beforeEach(async function() {
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    
            var randomPart = Math.round(9e9 * Math.random()).toFixed(0);
            collectionPrefix = `_testrun${randomPart}`;
            settings = new Settings("test");
            settings.current.collectionPrefix = `${collectionPrefix}${settings.current.collectionPrefix}`;
            database = new Database(settings);
            helpers = new JasmineSpecHelpers(database, settings);
            try {
                await database.connect();
                await database.createCollections();
            } catch (err) {
                console.log(`beforeEach failed with error: ${err.message}`);
            }
        })
    
        afterEach(async function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;

            try {
                await database.dropAllCollections(/_testrun\d+/);
                await database.disconnect();
            } catch (err) {
                console.log(`afterEach failed with error: ${err.message}`);
            }
        })

        it("checks that job was correctly inserted", async function(done) {
            let newWorker = new Worker(null);
            newWorker.guid = uuidv4();
            newWorker.ip = helpers.rndIp();
            newWorker.mac = helpers.rndMac();
            newWorker.port = helpers.rndPort();
            newWorker.firstSeen = new Date();
            newWorker.lastSeen = newWorker.firstSeen;
            newWorker.workgroup = "exotic";
            newWorker.cpuUsage = 0.1;
            newWorker.ramUsage = 0.2;
            newWorker.totalRam = 32;

            let workerAdded = await database.insertWorker(newWorker);
            expect(workerAdded).toBeTruthy();

            let worker = await database.getOne<Worker>("workers", { guid: newWorker.guid }, obj => new Worker(obj));

            expect(worker).toBeTruthy();
            expect(worker.guid).toBe(newWorker.guid);
            expect(worker.ip).toBe(newWorker.ip);
            expect(worker.mac).toBe(newWorker.mac);
            expect(worker.port).toBe(newWorker.port);
            expect(worker.firstSeen).toEqual(newWorker.firstSeen);
            expect(worker.lastSeen).toEqual(newWorker.lastSeen);
            expect(worker.workgroup).toBe(newWorker.workgroup);
            expect(worker.cpuUsage).toBe(newWorker.cpuUsage);
            expect(worker.ramUsage).toBe(newWorker.ramUsage);
            expect(worker.totalRam).toBe(newWorker.totalRam);

            done();
        })

        it("checks that job was correctly updated", async function(done) {
        })

        it("checks that job was correctly closed", async function(done) {
        })

        it("checks that job was correctly canceled", async function(done) {
        })

        it("checks that job was correctly failed", async function(done) {
        })

        it("checks that all active jobs are correctly returned", async function(done) {
        })

    }); // end of write tests */
});
