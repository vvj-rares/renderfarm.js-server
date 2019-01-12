import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";
import { JasmineHelpers } from "../jasmine.helpers";
import { Worker } from "./model/worker";

require("../jasmine.config")();
const uuidv4 = require('uuid/v4');

describe("Database Worker", function() {
    var originalTimeout;

    var settings: Settings;
    var database: Database;
    var helpers: JasmineHelpers;

    beforeEach(async function() {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

        settings = new Settings("test");
        database = new Database(settings);
        helpers = new JasmineHelpers(database, settings);
        await database.connect();
        await database.dropAllCollections(/_testrun\d+/);
        await database.disconnect();
    });

    afterEach(function() {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });

    describe("read-only test", function() {
        beforeEach(async function() {
            settings = new Settings("test");
            database = new Database(settings);
            await database.connect();
        });
    
        afterEach(async function() {
            await database.disconnect();
        })

        it("checks that recent workers belongs to current workgroup only", async function() {
            let defaultWorkers = await database.getRecentWorkers();
            expect(defaultWorkers.length).toBe(4);

            settings.current.workgroup = "other";

            let otherWorkers = await database.getRecentWorkers();
            expect(otherWorkers.length).toBe(2);
        });
    }); // end of read-only tests

    describe("write test", function() {
        var collectionPrefix: string;

        beforeEach(async function() {
            var randomPart = Math.round(9e9 * Math.random()).toFixed(0);
            collectionPrefix = `_testrun${randomPart}`;
            settings = new Settings("test");
            settings.current.collectionPrefix = `${collectionPrefix}${settings.current.collectionPrefix}`;
            database = new Database(settings);
            await database.connect();
            await database.createCollections();
        })
    
        afterEach(async function() {
            await database.dropCollections();
            await database.disconnect();
        })

        it("checks that worker was correctly persisted", async function() {
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

            let workerAdded = await database.storeWorker(newWorker);
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
        })

        async function createOnlineAndOfflineWorkers(): Promise<Worker[]> {
            let worker0 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let worker1 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let worker2 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());

            worker1.firstSeen = new Date( worker1.firstSeen.getTime() - 90*1000 ); // 90sec ago
            worker1.lastSeen = new Date( worker1.lastSeen.getTime() - 61*1000 ); // 61sec ago

            worker2.firstSeen = new Date( worker2.firstSeen.getTime() - 120*1000 ); // 120sec ago
            worker2.lastSeen = new Date( worker2.lastSeen.getTime() - 3*1000 ); // 3sec ago

            let stored0 = await database.storeWorker(worker0);
            expect(stored0).toBeTruthy();
            let stored1 = await database.storeWorker(worker1);
            expect(stored1).toBeTruthy();
            let stored2 = await database.storeWorker(worker2);
            expect(stored2).toBeTruthy();

            return [
                worker0, // must be online, with most recent lastSeen
                worker1, // must be older than "dead threshold"
                worker2  // must be "most recent, but yet considered offline"
            ];
        }

        it("checks that available and recent workers are returned correctly", async function() {
            let workers = await createOnlineAndOfflineWorkers();

            let availableWorkers = await database.getAvailableWorkers();
            expect(availableWorkers.length).toBe(1);
            expect(availableWorkers[0].guid).toBe(workers[0].guid);

            let recentWorkers = await database.getRecentWorkers();
            expect(recentWorkers.length).toBe(3);
        })

        it("checks that old workers are removed from the database", async function() {
            let workers = await createOnlineAndOfflineWorkers();

            let recentWorkers = await database.getRecentWorkers();
            expect(recentWorkers.length).toBe(3);

            let deleted = await database.deleteDeadWorkers();
            expect(deleted).toBe(1);
        })

    }); // end of write tests
});
