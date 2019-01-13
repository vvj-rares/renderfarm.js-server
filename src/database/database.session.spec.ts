import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";
import { isError, isArray } from "util";
import { Session } from "./model/session";
import { Worker } from "./model/worker";
import { JasmineHelpers } from "../jasmine.helpers";

require("../jasmine.config")();

describe("Database Session", function() {
    var settings: Settings;
    var database: Database;
    var helpers: JasmineHelpers;

    describe("read-only test", function() {
        beforeEach(async function() {
            settings = new Settings("test");
            database = new Database(settings);
            helpers = new JasmineHelpers(database, settings);
            await database.connect();
        });
    
        afterEach(async function() {
            await database.disconnect();
        })

        it("checks existing session", async function(done) {
            let session: Session = await database.getSession(helpers.existingSessionGuid);
    
            expect(session).toBeTruthy();
            expect(session.apiKey).toBe(helpers.existingApiKey);
            expect(session.guid).toBe(helpers.existingSessionGuid);
            expect(session.workerGuid).toBe(helpers.existingWorkerGuid);
            expect(session.firstSeen).toEqual(new Date("2019-01-08T12:25:07.029Z"));
            expect(new Date().getTime() - session.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(session.guid).toBe(helpers.existingSessionGuid);
            expect(session.workspaceGuid).toBe(helpers.existingWorkspaceGuid);
            expect(session.closed).toBeUndefined();
            expect(session.closedAt).toBeUndefined();

            expect(session.workerRef).toBeTruthy();
            expect(session.workerRef.guid).toBe(session.workerGuid);
            done();
        });
    
        it("checks not existing session", async function(done) {
            let result: Session;
            try {
                result = await database.getSession(helpers.notExistingSessionGuid);
            } catch (err) {
                expect(isError(err)).toBeTruthy();
                expect(err.message).toMatch("nothing was updated in sessions by \{.*?\}");
            }
            expect(result).toBeUndefined();
            done();
        });
    
        it("reconnects on not connected database when trying to get session", async function(done) {
            await database.disconnect();
    
            let session = await database.getSession(helpers.existingSessionGuid);
            expect(session).toBeTruthy();
            expect(session.guid).toBe(helpers.existingSessionGuid);
            done();
        });
    }); // end of read-only tests

    describe("write test", function() {
        var collectionPrefix: string;
        var originalTimeout;

        beforeEach(async function() {
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    
            var randomPart = Math.round(9e9 * Math.random()).toFixed(0);
            collectionPrefix = `_testrun${randomPart}`;
            settings = new Settings("test");
            settings.current.collectionPrefix = `${collectionPrefix}${settings.current.collectionPrefix}`;
            database = new Database(settings);
            helpers = new JasmineHelpers(database, settings);
            await database.connect();
            await database.createCollections();
        })
    
        afterEach(async function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;

            await database.dropAllCollections(/_testrun\d+/);
            await database.disconnect();
        })

        it("creates session and grabs available worker", async function(done) {
            let newWorker = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let workspace = await helpers.createSomeWorkspace();
            let session: Session = await database.createSession(helpers.existingApiKey, workspace.guid);

            //now check how session was created on the database, and if it has worker assigned
            expect(session).toBeTruthy();
            expect(session.apiKey).toBe(helpers.existingApiKey);
            expect(new Date().getTime() - session.firstSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(new Date().getTime() - session.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(session.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);
            expect(session.workerGuid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);
            expect(session.workspaceGuid).toBe(workspace.guid);
            expect(session.closed).toBeUndefined();
            expect(session.closedAt).toBeUndefined();
            // and check that ref on assigned worker was correctly resolved
            expect(session.workerRef).toBeTruthy();
            expect(session.workerRef.guid).toBe(session.workerGuid);
            expect(session.workerRef.sessionGuid).toBe(session.guid);

            // and check that ref on assigned workspace was correctly resolved
            expect(session.workspaceRef).toBeTruthy();
            expect(session.workspaceRef.guid).toBe(workspace.guid);

            let worker = await database.getOne<Worker>("workers", { guid: newWorker.guid }, obj => new Worker(obj));

            // now check that worker is correctly initialized, and has assigned session
            expect(worker).toBeTruthy();
            expect(worker.guid).toBe(newWorker.guid);
            expect(worker.mac).toBe(newWorker.mac);
            expect(worker.ip).toBe(newWorker.ip);
            expect(worker.port).toBe(newWorker.port);
            expect(worker.workgroup).toBe(newWorker.workgroup);
            expect(worker.cpuUsage).toBe(newWorker.cpuUsage);
            expect(worker.ramUsage).toBe(newWorker.ramUsage);
            expect(worker.totalRam).toBe(newWorker.totalRam);
            expect(new Date().getTime() - worker.firstSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(new Date().getTime() - worker.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(worker.firstSeen.getTime()).toBeLessThanOrEqual(worker.lastSeen.getTime());
            expect(worker.sessionGuid).toBe(session.guid);
            done();
        })

        it("closes session and releases worker", async function(done) {
            let newWorker = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let workspace = await helpers.createSomeWorkspace();
            let session = await database.createSession(helpers.existingApiKey, workspace.guid);

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
            done();
        })

        it("expires one session and releases one worker", async function(done) {
            let newWorker = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let workspace = await helpers.createSomeWorkspace();
            let session = await database.createSession(helpers.existingApiKey, workspace.guid);

            let grabbedWorker = await database.getOne<Worker>("workers", { guid: newWorker.guid }, obj => new Worker(obj));

            expect(grabbedWorker).toBeTruthy();
            expect(grabbedWorker.sessionGuid).toBe(session.guid);

            let expiredSessions = await database.expireSessions(0);

            expect(isArray(expiredSessions)).toBeTruthy();
            expect(expiredSessions.length).toBe(1);

            let releasedWorker = await database.getOne<Worker>("workers", { guid: newWorker.guid }, obj => new Worker(obj));

            expect(releasedWorker.guid).toBe(grabbedWorker.guid); // ensure we released same worker as we grabbed
            expect(releasedWorker.sessionGuid).toBeNull();
            //now check that expired sessions have actualized worker refs
            expect(expiredSessions[0].workerRef).toBeTruthy();
            expect(expiredSessions[0].workerRef.sessionGuid).toBeNull();
            expect(expiredSessions[0].workerRef.guid).toBe(newWorker.guid);
            done();
        })

        it("checks that workers with less CPU load are grabbed first", async function(done) {
            let worker0 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort(), 0.9);
            let worker1 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort(), 0.1);
            let worker2 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort(), 0.3);
            let worker3 = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort(), 0.5);

            let workspace = await helpers.createSomeWorkspace();

            await helpers.touchWorkers(worker0, worker1, worker2, worker3);
            let session0 = await database.createSession(helpers.existingApiKey, workspace.guid);

            await helpers.touchWorkers(worker0, worker1, worker2, worker3);
            let session1 = await database.createSession(helpers.existingApiKey, workspace.guid);

            await helpers.touchWorkers(worker0, worker1, worker2, worker3);
            let session2 = await database.createSession(helpers.existingApiKey, workspace.guid);

            await helpers.touchWorkers(worker0, worker1, worker2, worker3);
            let session3 = await database.createSession(helpers.existingApiKey, workspace.guid);

            let grabbedWorker0 = await database.getOne<Worker>("workers", { sessionGuid: session0.guid }, obj => new Worker(obj));
            expect(grabbedWorker0).toBeTruthy();
            expect(grabbedWorker0.sessionGuid).toBe(session0.guid);

            let grabbedWorker1 = await database.getOne<Worker>("workers", { sessionGuid: session1.guid }, obj => new Worker(obj));
            expect(grabbedWorker1).toBeTruthy();
            expect(grabbedWorker1.sessionGuid).toBe(session1.guid);

            let grabbedWorker2 = await database.getOne<Worker>("workers", { sessionGuid: session2.guid }, obj => new Worker(obj));
            expect(grabbedWorker2).toBeTruthy();
            expect(grabbedWorker2.sessionGuid).toBe(session2.guid);

            let grabbedWorker3 = await database.getOne<Worker>("workers", { sessionGuid: session3.guid }, obj => new Worker(obj));
            expect(grabbedWorker3).toBeTruthy();
            expect(grabbedWorker3.sessionGuid).toBe(session3.guid);

            expect(grabbedWorker0.cpuUsage).toBe(0.1);
            expect(grabbedWorker1.cpuUsage).toBe(0.3);
            expect(grabbedWorker2.cpuUsage).toBe(0.5);
            expect(grabbedWorker3.cpuUsage).toBe(0.9);
            done();
        })

        it("checks that session fails to open when no more workers available", async function(done) {
            await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort(), 0.1);
            let workspace = await helpers.createSomeWorkspace();

            let session0 = await database.createSession(helpers.existingApiKey, workspace.guid);
            expect(session0).toBeTruthy();

            try {
                await database.createSession(helpers.existingApiKey, workspace.guid);
                fail();
            } catch (err) {
                expect(isError(err));
                expect(err.message).toBe("all workers busy");
                done();
            }
        })

        it("checks that another session can reuse previously released worker", async function(done) {
            let worker = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort(), 0.1);
            let workspace = await helpers.createSomeWorkspace();

            let session0 = await database.createSession(helpers.existingApiKey, workspace.guid);
            expect(session0).toBeTruthy();
            expect(session0.workerGuid).toBe(worker.guid);

            let closedSession0 = await database.closeSession(session0.guid);
            expect(closedSession0).toBeTruthy();

            let session1 = await database.createSession(helpers.existingApiKey, workspace.guid);
            expect(session1).toBeTruthy();
            expect(session1.workerGuid).toBe(worker.guid);
            done();
        })

        it("checks that session does not grab offline worker", async function(done) {
            let worker = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort(), 0.1);
            let workspace = await helpers.createSomeWorkspace();

            //make worker Offline
            let firstSeen = new Date(new Date().getTime() - 3000); // 3 seconds back
            let lastSeen  = new Date(new Date().getTime() - 2001); // 2.001 seconds back

            let offlineWorker = await database.findOneAndUpdate(
                "workers", 
                { guid: worker.guid }, 
                { $set: { firstSeen: firstSeen, lastSeen: lastSeen }}, 
                obj => new Worker(obj));

            expect(offlineWorker).toBeTruthy();
            //worker is older than 2 seconds => means worker did not send heartbeats => means worker dead
            expect(new Date().getTime() - offlineWorker.lastSeen.getTime()).toBeGreaterThan(2000);

            try {
                await database.createSession(helpers.existingApiKey, workspace.guid);
                fail();
            } catch (err) {
                expect(isError(err));
                expect(err.message).toBe("all workers busy");
            }

            //now make worker Online, and try again
            let onlineWorker = await database.findOneAndUpdate(
                "workers", 
                { guid: worker.guid }, 
                { $set: { firstSeen: firstSeen, lastSeen: new Date() }},
                obj => new Worker(obj));

            expect(onlineWorker).toBeTruthy();
            //worker is younger than 2 seconds => means worker is most likely alive
            expect(new Date().getTime() - onlineWorker.lastSeen.getTime()).toBeLessThan(2000);

            let session = await database.createSession(helpers.existingApiKey, workspace.guid);
            expect(session).toBeTruthy();
            done();
        })

        it("checks that closed session can not be closed twice", async function(done) {
            let worker = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let workspace = await helpers.createSomeWorkspace();

            let session0 = await database.createSession(helpers.existingApiKey, workspace.guid);
            expect(session0).toBeTruthy();
            expect(session0.workerGuid).toBe(worker.guid);

            let closedSession0 = await database.closeSession(session0.guid);
            expect(closedSession0).toBeTruthy();

            try {
                await database.closeSession(session0.guid);
                fail();
            } catch (err) {
                expect(isError(err));
                expect(err.message).toBe("session not found");
                done();
            }
        })

        it("checks that expired session can not be closed", async function(done) {
            let worker = await helpers.createSomeWorker(helpers.rndMac(), helpers.rndIp(), helpers.rndPort());
            let workspace = await helpers.createSomeWorkspace();

            let session0 = await database.createSession(helpers.existingApiKey, workspace.guid);
            expect(session0).toBeTruthy();
            expect(session0.workerGuid).toBe(worker.guid);

            let expiredSessions = await database.expireSessions(0);
            expect(isArray(expiredSessions)).toBeTruthy();
            expect(expiredSessions.length).toBe(1);

            try {
                await database.closeSession(session0.guid);
                fail();
            } catch (err) {
                expect(isError(err));
                expect(err.message).toBe("session not found");
                done();
            }
        })
    }); // end of write tests
});
