import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";
import { isError, isArray } from "util";
import { Session } from "./model/session";
import { Worker } from "./model/worker";
import { Workspace } from "./model/workspace";

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

    describe("read-only test", function() {
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

        function rndMac(): string {
            let res = "";
            for (let i=0; i<12; i++) {
                res += Math.round(15 * Math.random()).toString(16);
            }
            return res;
        }

        function rndIp(): string {
            let a1 = 2 + Math.round(252 * Math.random());
            let a2 = 2 + Math.round(252 * Math.random());
            return `192.168.${a1}.${a2}`;
        }

        function rndPort(): number {
            return 10000 + Math.round(50000 * Math.random());
        }

        async function createSomeWorker(mac, ip, port, cpuUsage = undefined) {
            let newWorker = new Worker(null);
            newWorker.guid = uuidv4();
            newWorker.mac = mac;
            newWorker.ip = ip;
            newWorker.port = port;
            newWorker.workgroup = "default";
            newWorker.cpuUsage = cpuUsage !== undefined ? cpuUsage : Math.random();
            newWorker.ramUsage = Math.random();
            newWorker.totalRam = 32;

            // add fresh worker for the session
            let isWorkerStored = await database.storeWorker(newWorker);
            expect(isWorkerStored).toBeTruthy();

            return newWorker;
        }

        async function createSomeWorkspace() {
            let newWorkspace = new Workspace(null);
            newWorkspace.guid = uuidv4();
            newWorkspace.apiKey = existingApiKey;
            newWorkspace.workgroup = settings.current.workgroup;
            newWorkspace.homeDir = "temp";
            newWorkspace.lastSeen = new Date();
            newWorkspace.name = "Test Workspace";

            // add fresh worker for the session
            let isWorkspaceStored = await database.insertOne<Workspace>("workspaces", newWorkspace, obj => new Workspace(obj));
            expect(isWorkspaceStored).toBeTruthy();

            return newWorkspace;
        }

        async function createSomeSession(workspaceGuid: string) {
            let session: Session = await database.createSession(existingApiKey, workspaceGuid);
            expect(session).toBeTruthy();
            // check that refs were resolved well
            expect(session.workerRef).toBeTruthy();
            expect(session.workerRef.sessionGuid).toBe(session.guid);

            expect(session.workspaceRef).toBeTruthy();
            expect(session.workspaceRef.guid).toBe(workspaceGuid);

            return session;
        }

        it("creates session and grabs available worker", async function() {
            let newWorker = await createSomeWorker(rndMac(), rndIp(), rndPort());
            let workspace = await createSomeWorkspace();
            let session: Session = await database.createSession(existingApiKey, workspace.guid);

            //now check how session was created on the database, and if it has worker assigned
            expect(session).toBeTruthy();
            expect(session.apiKey).toBe(existingApiKey);
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
            expect(worker.firstSeen.getTime()).toBeLessThan(worker.lastSeen.getTime());
            expect(worker.sessionGuid).toBe(session.guid);
        })

        it("closes session and releases worker", async function() {
            let newWorker = await createSomeWorker(rndMac(), rndIp(), rndPort());
            let workspace = await createSomeWorkspace();
            let session = await createSomeSession(workspace.guid);

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

        it("expires one session and releases one worker", async function() {
            let newWorker = await createSomeWorker(rndMac(), rndIp(), rndPort());
            let workspace = await createSomeWorkspace();
            let session = await createSomeSession(workspace.guid);

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
        })

        it("checks that workers with less CPU load are grabbed first", async function() {
            await createSomeWorker(rndMac(), rndIp(), rndPort(), 0.9);
            await createSomeWorker(rndMac(), rndIp(), rndPort(), 0.1);
            await createSomeWorker(rndMac(), rndIp(), rndPort(), 0.3);
            await createSomeWorker(rndMac(), rndIp(), rndPort(), 0.5);

            let workspace = await createSomeWorkspace();

            let session0 = await createSomeSession(workspace.guid);
            let session1 = await createSomeSession(workspace.guid);
            let session2 = await createSomeSession(workspace.guid);
            let session3 = await createSomeSession(workspace.guid);

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
        })

        it("checks that session fails to open when no more workers available", async function() {
            await createSomeWorker(rndMac(), rndIp(), rndPort(), 0.1);
            let workspace = await createSomeWorkspace();

            let session0 = await createSomeSession(workspace.guid);
            expect(session0).toBeTruthy();

            try {
                await createSomeSession(workspace.guid);
                fail();
            } catch (err) {
                expect(isError(err));
                expect(err.message).toBe("all workers busy");
            }
        })

        it("checks that another session can reuse previously released worker", async function() {
            let worker = await createSomeWorker(rndMac(), rndIp(), rndPort(), 0.1);
            let workspace = await createSomeWorkspace();

            let session0 = await createSomeSession(workspace.guid);
            expect(session0).toBeTruthy();
            expect(session0.workerGuid).toBe(worker.guid);

            let closedSession0 = await database.closeSession(session0.guid);
            expect(closedSession0).toBeTruthy();

            let session1 = await createSomeSession(workspace.guid);
            expect(session1).toBeTruthy();
            expect(session1.workerGuid).toBe(worker.guid);
        })

        it("checks that session does not grab offline worker", async function() {
            let worker = await createSomeWorker(rndMac(), rndIp(), rndPort(), 0.1);
            let workspace = await createSomeWorkspace();

            //make worker Offline
            let firstSeen = new Date(new Date().getTime() - 3000); // 3 seconds back
            let lastSeen  = new Date(new Date().getTime() - 2000); // 2 seconds back

            let offlineWorker = await database.findOneAndUpdate(
                "workers", 
                { guid: worker.guid }, 
                { $set: { firstSeen: firstSeen, lastSeen: lastSeen }}, 
                obj => new Worker(obj));

            expect(offlineWorker).toBeTruthy();
            //worker is older than 2 seconds => means worker did not send heartbeats => means worker dead
            expect(new Date().getTime() - offlineWorker.lastSeen.getTime()).toBeGreaterThan(2000);

            try {
                await createSomeSession(workspace.guid);
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

            let session = await createSomeSession(workspace.guid);
            expect(session).toBeTruthy();
        })

        it("checks that closed session can not be closed twice", async function() {
            let worker = await createSomeWorker(rndMac(), rndIp(), rndPort());
            let workspace = await createSomeWorkspace();

            let session0 = await createSomeSession(workspace.guid);
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
            }
        })

        it("checks that expired session can not be closed", async function() {
            let worker = await createSomeWorker(rndMac(), rndIp(), rndPort());
            let workspace = await createSomeWorkspace();

            let session0 = await createSomeSession(workspace.guid);
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
            }
        })
    }); // end of write tests
});
