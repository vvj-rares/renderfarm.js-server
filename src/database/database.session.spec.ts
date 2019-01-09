import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";
import { isError } from "util";
import { Session } from "./model/session";
import { Worker } from "./model/worker";

require("../jasmine.config")();

const uuidv4 = require('uuid/v4');

describe("Database Session", function() {
    var settings: Settings;
    var database: Database;

    const existingApiKey: string = "0000-0001";
    const existingSessionGuid: string = "00000000-1111-0000-0000-000000000001";
    const notExistingSessionGuid: string = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const existingWorkspaceGuid: string = "00000000-0000-0000-1111-000000000001";
    const existingWorkerGuid: string = "00000000-cccc-0000-0000-000000000001";

    beforeEach(async function() {
        settings = new Settings("test");
        database = new Database(settings);
        await database.connect();
        await database.dropAllCollections(/_testrun\d+/);
        await database.disconnect();
    });

    describe("(read-only test):", function() {
        beforeEach(async function() {
            settings = new Settings("test");
            database = new Database(settings);
            await database.connect();
        });
    
        afterEach(async function() {
            await database.disconnect();
        })

        it("checks existing session", async function() {
            let session: Session = await database.getSession(existingSessionGuid);
    
            expect(session).toBeTruthy();
            expect(session.apiKey).toBe(existingApiKey);
            expect(session.guid).toBe(existingSessionGuid);
            expect(session.workerGuid).toBe(existingWorkerGuid);
            expect(session.firstSeen).toEqual(new Date("2019-01-08T12:25:07.029Z"));
            expect(new Date().getTime() - session.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(session.guid).toBe(existingSessionGuid);
            expect(session.workspaceGuid).toBe(existingWorkspaceGuid);
            expect(session.closed).toBeUndefined();
            expect(session.closedAt).toBeUndefined();

            expect(session.workerRef).toBeTruthy();
            expect(session.workerRef.guid).toBe(session.workerGuid);
        });
    
        it("checks not existing session", async function() {
            let result: Session;
            try {
                result = await database.getSession(notExistingSessionGuid);
            } catch (err) {
                expect(isError(err)).toBeTruthy();
                expect(err.message.indexOf("nothing was filtered from sessions")).not.toBe(-1);
            }
            expect(result).toBeUndefined();
        });
    
        it("reconnects on not connected database when trying to get session", async function() {
            await database.disconnect();
    
            let session = await database.getSession(existingSessionGuid);
            expect(session).toBeTruthy();
            expect(session.guid).toBe(existingSessionGuid);
        });
    }); // end of read-only tests

    describe("(write tests)", function() {
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

        it("creates session and grabs available worker", async function() {
            let newWorker = new Worker(null);
            newWorker.guid = uuidv4();
            newWorker.mac = "8cdd4f1db843";
            newWorker.ip = "192.168.0.100";
            newWorker.port = 24293;
            newWorker.workgroup = "default";
            newWorker.cpuUsage = 0.01;
            newWorker.ramUsage = 0.02;
            newWorker.totalRam = 7.99;

            // add fresh worker for the session
            let isWorkerStored = await database.storeWorker(newWorker);
            expect(isWorkerStored).toBeTruthy();

            let session: Session = await database.createSession(existingApiKey, existingWorkspaceGuid);

            //now check how session was created on the database, and if it has worker assigned
            expect(session).toBeTruthy();
            expect(session.apiKey).toBe(existingApiKey);
            expect(new Date().getTime() - session.firstSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(new Date().getTime() - session.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(session.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);
            expect(session.workerGuid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);
            expect(session.workspaceGuid).toBe(existingWorkspaceGuid);
            expect(session.closed).toBeUndefined();
            expect(session.closedAt).toBeUndefined();
            // and check that ref on assigned worker was correctly resolved
            expect(session.workerRef).toBeTruthy();
            expect(session.workerRef.guid).toBe(session.workerGuid);
            expect(session.workerRef.sessionGuid).toBe(session.guid);

            let worker = await database.getOne<Worker>("workers", { endpoint: "192.168.0.100:24293" }, obj => new Worker(obj));

            // now check that worker is correctly initialized, and has assigned session
            expect(worker).toBeTruthy();
            expect(worker.mac).toBe("8cdd4f1db843");
            expect(worker.ip).toBe("192.168.0.100");
            expect(worker.port).toBe(24293);
            expect(worker.workgroup).toBe("default");
            expect(worker.cpuUsage).toBe(0.01);
            expect(worker.ramUsage).toBe(0.02);
            expect(worker.totalRam).toBe(7.99);
            expect(new Date().getTime() - worker.firstSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(new Date().getTime() - worker.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(worker.firstSeen.getTime()).toBeLessThan(worker.lastSeen.getTime());
            expect(worker.sessionGuid).toBe(session.guid);
        })

        it("closes session and releases worker", async function() {
            let newWorker = new Worker(null);
            newWorker.guid = uuidv4();
            newWorker.mac = "6a15eefcf0d6";
            newWorker.ip = "192.168.5.67";
            newWorker.port = 19283;
            newWorker.workgroup = "default";
            newWorker.cpuUsage = 0.02;
            newWorker.ramUsage = 0.13;
            newWorker.totalRam = 256;

            // add fresh worker for the session
            let isWorkerStored = await database.storeWorker(newWorker);
            expect(isWorkerStored).toBeTruthy();

            let session: Session = await database.createSession(existingApiKey, existingWorkspaceGuid);
            expect(session).toBeTruthy();
            // check that refs were resolved well
            expect(session.workerRef).toBeTruthy();
            expect(session.workerRef.sessionGuid).toBe(session.guid);

            let closedSession = await database.closeSession(session.guid);
            
            expect(closedSession).toBeTruthy();
            expect(closedSession.guid).toBe(session.guid);
            expect(closedSession.closed).toBeTruthy();
            expect(closedSession.expired).toBeNull();
            expect(closedSession.closedAt).toBeTruthy();
            expect(new Date().getTime() - closedSession.closedAt.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            //now check that we actually released worker
            expect(closedSession.workerGuid).toBe(newWorker.guid);
            expect(closedSession.workerRef).toBeTruthy();
            expect(closedSession.workerRef.sessionGuid).toBeNull();
        })
    }); // end of write tests
});
