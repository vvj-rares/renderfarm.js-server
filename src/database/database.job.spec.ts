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

    describe("write test", function() {
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

        async function createSomeJob() {
            let jobAdded = await database.createJob(helpers.existingApiKey, helpers.existingWorkerGuid);
            expect(jobAdded).toBeTruthy();

            return jobAdded;
        }

        it("checks that job was correctly inserted", async function(done) {
            let newJob = await createSomeJob();

            let job = await database.getOne<Job>("jobs", { guid: newJob.guid }, obj => new Job(obj));

            expect(job).toBeTruthy();
            expect(job.guid).toBe(newJob.guid);
            expect(job.apiKey).toBe(helpers.existingApiKey);
            expect(job.workerGuid).toBe(helpers.existingWorkerGuid);
            expect(job.state).toBe("pending");
            expect(Date.now() - job.createdAt.getTime()).toBeLessThan(3000);
            expect(job.updatedAt.getTime()).toBeGreaterThanOrEqual(newJob.createdAt.getTime());

            done();
        })

        it("checks that job was correctly updated", async function(done) {
            let newJob = await createSomeJob();

            let updatedJob = await database.updateJob(newJob, { $set: { state: "running" , updatedAt: new Date() } });

            expect(updatedJob).toBeTruthy();
            expect(updatedJob.state).toBe("running");
            expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(newJob.createdAt.getTime());

            done();
        })

        it("checks that job was correctly closed", async function(done) {
            let newJob = await createSomeJob();

            let closedJob = await database.completeJob(newJob, [ "https://example.com/1", "https://example.com/2" ]);

            expect(closedJob).toBeTruthy();
            expect(closedJob.state).toBeNull();
            expect(closedJob.closed).toBeTruthy();
            expect(closedJob.canceled).toBeNull();
            expect(closedJob.failed).toBeNull();

            expect(closedJob.createdAt).toEqual(closedJob.updatedAt);
            expect(closedJob.createdAt.getTime()).toBeLessThanOrEqual(closedJob.closedAt.getTime());

            expect(isArray(closedJob.urls)).toBeTruthy();
            expect(closedJob.urls.length).toBe(2);
            expect(closedJob.urls[0]).toBe("https://example.com/1");
            expect(closedJob.urls[1]).toBe("https://example.com/2");

            done();
        })

        it("checks that job was correctly canceled", async function(done) {
            let newJob = await createSomeJob();

            let canceledJob = await database.cancelJob(newJob);
            console.log(canceledJob);

            expect(canceledJob).toBeTruthy();
            expect(canceledJob.state).toBeNull();
            expect(canceledJob.closed).toBeTruthy();
            expect(canceledJob.canceled).toBeTruthy();
            expect(canceledJob.failed).toBeNull();

            expect(canceledJob.createdAt).toEqual(canceledJob.updatedAt);
            expect(canceledJob.createdAt.getTime()).toBeLessThanOrEqual(canceledJob.closedAt.getTime());

            expect(isArray(canceledJob.urls)).toBeTruthy();
            expect(canceledJob.urls.length).toBe(0);

            done();
        })

        it("checks that job was correctly failed", async function(done) {
            let newJob = await createSomeJob();

            let failedJob: Job = await database.failJob(newJob, "test failure");

            expect(failedJob).toBeTruthy();
            expect(failedJob.state).toBeNull();
            expect(failedJob.closed).toBeTruthy();
            expect(failedJob.canceled).toBeNull();
            expect(failedJob.failed).toBeTruthy();

            expect(failedJob.createdAt).toEqual(failedJob.updatedAt);
            expect(failedJob.createdAt.getTime()).toBeLessThanOrEqual(failedJob.closedAt.getTime());

            expect(isArray(failedJob.urls)).toBeTruthy();
            expect(failedJob.urls.length).toBe(0);

            expect(failedJob.error).toBe("test failure");

            done();
        })

        it("checks that all active jobs are correctly returned", async function(done) {
            done();
        })

    }); // end of write tests */
});
