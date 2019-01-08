import "reflect-metadata";

import { ISettings, IDatabase } from "../interfaces";
import { Settings } from "../settings";
import { Database } from "./database";
import { ApiKey } from "./model/api_key";
import { isString } from "util";
import { Session } from "./model/session";

describe("Database", function() {
    var settings: ISettings;
    var database: IDatabase;

    const existingApiKey: string = "0000-0001";
    const existingSessionGuid: string = "00000000-1111-0000-0000-000000000001";
    const notExistingSessionGuid: string = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const existingWorkspaceGuid: string = "00000000-0000-0000-1111-000000000001";

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
});
