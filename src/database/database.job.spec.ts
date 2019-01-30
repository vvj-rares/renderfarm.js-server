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

            console.log("job: ", job);

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
            expect(job.workerRef.sessionGuid).toBeTruthy();

/*
  guid: '00000000-396c-434d-b876-000000000001',
  apiKey: '0000-0001',
  createdAt: 1999-12-31T23:00:00.000Z,
  updatedAt: 1999-12-31T23:00:00.000Z,
  closedAt: 1999-12-31T23:00:00.000Z,
  workerGuid: '00000000-cccc-0000-0000-000000000001',
  state: 'pending',
  closed: null,
  canceled: null,
  failed: null,
  urls: 
   [ 'https://dev1.renderfarmjs.com/v1/renderoutput/123456-color.png',
     'https://dev1.renderfarmjs.com/v1/renderoutput/123456-alpha.png' ],
  workerRef: 
   Worker {
     guid: '00000000-cccc-0000-0000-000000000001',
     mac: '001122334455',
     ip: '192.168.88.100',
     port: 34092,
     endpoint: '192.168.88.100:34092',
     workgroup: 'default',
     firstSeen: 1999-12-31T23:00:00.000Z,
     lastSeen: 1999-12-31T23:00:00.000Z,
     cpuUsage: 0.19,
     ramUsage: 0.51,
     totalRam: 15.9,
     sessionGuid: '00000000-1111-0000-0000-000000000001' } }

*/


            // expect(job.workerGuid).toBe(helpers.existingWorkerGuid);
            // expect(job.firstSeen).toEqual(new Date("2019-01-08T12:25:07.029Z"));
            // expect(new Date().getTime() - job.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            // expect(job.guid).toBe(helpers.existingSessionGuid);
            // expect(job.workspaceGuid).toBe(helpers.existingWorkspaceGuid);
            // expect(job.closed).toBeNull();
            // expect(job.closedAt).toBeNull();

            // expect(job.workerRef).toBeTruthy();
            // expect(job.workerRef.guid).toBe(job.workerGuid);

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

        it("checks that worker was correctly persisted", async function(done) {
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

        it("checks that worker was correctly upserted", async function(done) {
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

            let workerAdded1 = await database.upsertWorker(newWorker);
            expect(workerAdded1).toBeTruthy();

            newWorker.cpuUsage = 0.5;
            newWorker.ramUsage = 0.75;

            let workerAdded2 = await database.upsertWorker(newWorker);
            expect(workerAdded2).toBeTruthy();

            let worker = await database.getOne<Worker>("workers", { guid: newWorker.guid }, obj => new Worker(obj));

            expect(worker).toBeTruthy();
            expect(worker.guid).toBe(newWorker.guid);
            expect(worker.cpuUsage).toBe(0.5);
            expect(worker.ramUsage).toBe(0.75);

            done();
        })

        async function createOnlineAndOfflineWorkers(): Promise<Worker[]> {
            let worker0 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let worker1 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let worker2 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());

            worker1.firstSeen = new Date( worker1.firstSeen.getTime() - 90*1000 ); // 90sec ago
            worker1.lastSeen = new Date( worker1.lastSeen.getTime() - 31*1000 ); // 31sec ago

            worker2.firstSeen = new Date( worker2.firstSeen.getTime() - 120*1000 ); // 120sec ago
            worker2.lastSeen = new Date( worker2.lastSeen.getTime() - 3*1000 ); // 3sec ago

            let stored1 = await database.findOneAndUpdate<Worker>(
                "workers", 
                worker1.filter, 
                { $set: { firstSeen: worker1.firstSeen, lastSeen: worker1.lastSeen } }, 
                obj => new Worker(obj));
            expect(stored1).toBeTruthy();

            let stored2 = await database.findOneAndUpdate<Worker>(
                "workers", 
                worker2.filter, 
                { $set: { firstSeen: worker2.firstSeen, lastSeen: worker2.lastSeen } }, 
                obj => new Worker(obj));
            expect(stored2).toBeTruthy();

            return [
                worker0, // must be online, with most recent lastSeen
                stored1, // must be older than "dead threshold"
                stored2  // must be "most recent, but yet considered offline"
            ];
        }

        it("checks that available and recent workers are returned correctly", async function(done) {
            await createOnlineAndOfflineWorkers();

            let recentWorkers = await database.getRecentWorkers();
            expect(recentWorkers.length).toBe(3);

            let availableWorkers = await database.getAvailableWorkers();
            expect(availableWorkers.length).toBe(1);

            done();
        })
    }); // end of write tests */
});
