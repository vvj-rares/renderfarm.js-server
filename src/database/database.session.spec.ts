import "reflect-metadata";

import { ISettings, IDatabase } from "../interfaces";
import { Settings } from "../settings";
import { Database } from "./database";
import { ApiKey } from "./model/api_key";
import { isString } from "util";
import { Session } from "./model/session";
import { Worker } from "./model/worker";
import { WorkerInfo } from "../model/worker_info";

describe("Database", function() {
    var settings: Settings;
    var database: Database;

    const existingApiKey: string = "0000-0001";
    const existingSessionGuid: string = "00000000-1111-0000-0000-000000000001";
    const notExistingSessionGuid: string = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const existingWorkspaceGuid: string = "00000000-0000-0000-1111-000000000001";

    describe("read-only tests", function() {
        beforeEach(async function() {
            settings = new Settings("test");
            database = new Database(settings);
            await database.connect();
        });
    
        afterEach(async function() {
            await database.disconnect();
        })

        it("checks existing session", async function() {
            let result: Session = await database.getSession(existingSessionGuid);
    
            expect(result).toBeTruthy();
            expect(result.apiKey).toBe(existingApiKey);
            expect(result.guid).toBe(existingSessionGuid);
            expect(result.workerEndpoint).toBe("192.168.0.1:9999");
            expect(result.firstSeen).toEqual(new Date("2019-01-08T12:25:07.029Z"));
            expect(new Date().getTime() - result.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(result.guid).toBe(existingSessionGuid);
            expect(result.workspaceGuid).toBe(existingWorkspaceGuid);
            expect(result.closed).toBeUndefined();
            expect(result.closedAt).toBeUndefined();
        });
    
        it("checks not existing session", async function() {
            let result: Session;
            try {
                result = await database.getSession(notExistingSessionGuid);
            } catch (err) {
                expect(isString(err)).toBeTruthy();
            }
            expect(result).toBeUndefined();
        });
    
        it("rejects session check on not connected database", async function() {
            await database.disconnect();
    
            try {
                await database.getSession(existingSessionGuid);
            } catch (err) {
                expect(err).toBe("database not connected");
                return;
            }
    
            fail();
        });
    }); // end of read-only tests

    describe("write tests", function() {
        var collectionPrefix: string;

        beforeEach(async function() {
            var randomPart = Math.round(9e9 * Math.random()).toFixed(0);
            collectionPrefix = `_testrun${randomPart}`;
            settings = new Settings("test");
            settings.current.collectionPrefix = `${collectionPrefix}${settings.current.collectionPrefix}`;
            database = new Database(settings);
            await database.connect();
            await database.createCollections();
        });
    
        afterEach(async function() {
            await database.dropCollections();
            await database.disconnect();
        })

        it("creates a new session", async function() {
            let newWorker = new Worker(null);
            newWorker.mac = "001122334455";
            newWorker.ip = "192.168.0.100";
            newWorker.port = 24293;
            newWorker.workgroup = "default";
            newWorker.cpuUsage = 0.01;
            newWorker.ramUsage = 0.02;
            newWorker.totalRam = 7.99;

            // add fresh worker for the session
            let workerStored = await database.storeWorker(newWorker);
            expect(workerStored).toBeTruthy();

            let session: Session = await database.createSession(existingApiKey, existingWorkspaceGuid);

            //now check how session was created on the database, and if it has worker assigned
            expect(session).toBeTruthy();
            expect(session.apiKey).toBe(existingApiKey);
            expect(new Date().getTime() - session.firstSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(new Date().getTime() - session.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(session.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);
            expect(session.workerEndpoint).toBe("192.168.0.100:24293");
            expect(session.workspaceGuid).toBe(existingWorkspaceGuid);
            expect(session.closed).toBeUndefined();
            expect(session.closedAt).toBeUndefined();

            let updatedWorker = await database.getOne<Worker>("workers", { endpoint: "192.168.0.100:24293" }, obj => new Worker(obj));

            // now check that worker is correctly initialized, and has assigned session
            expect(updatedWorker).toBeTruthy();
            expect(updatedWorker.mac).toBe("001122334455");
            expect(updatedWorker.ip).toBe("192.168.0.100");
            expect(updatedWorker.port).toBe(24293);
            expect(updatedWorker.workgroup).toBe("default");
            expect(updatedWorker.cpuUsage).toBe(0.01);
            expect(updatedWorker.ramUsage).toBe(0.02);
            expect(updatedWorker.totalRam).toBe(7.99);
            expect(new Date().getTime() - updatedWorker.firstSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(new Date().getTime() - updatedWorker.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            expect(updatedWorker.firstSeen.getTime()).toBeLessThan(updatedWorker.lastSeen.getTime());
            expect(updatedWorker.sessionGuid).toBe(session.guid);
        });
    }); // end of write tests
});
