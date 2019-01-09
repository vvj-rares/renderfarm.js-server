import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";
import { ApiKey } from "./model/api_key";
import { isError } from "util";

require("../jasmine.config")();

describe("Database ApiKey", function() {
    var settings: Settings;
    var database: Database;

    const existingApiKey: string = "0000-0001";
    const existingUserGuid: string = "00000000-0000-0000-0000-000000000001";

    beforeEach(async function() {
        settings = new Settings("test");
        database = new Database(settings);
        await database.connect();
        await database.dropAllCollections(/_testrun\d+/);
        await database.disconnect();
    });

    describe("(read-only tests):", function() {
        beforeEach(async function() {
            settings = new Settings("test");
            database = new Database(settings);
            await database.connect();
        });

        afterEach(async function() {
            await database.disconnect();
        })

        it("checks existing api key", async function() {
            let result: ApiKey = await database.getApiKey(existingApiKey);

            expect(result).toBeTruthy();
            expect(result.apiKey).toBe(existingApiKey);
            expect(result.userGuid).toBe(existingUserGuid);
            expect(new Date().getTime() - result.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
        });

        it("checks not existing api key", async function() {
            let result: ApiKey;
            try {
                result = await database.getApiKey("not-existing");
            } catch (err) {
                expect(isError(err)).toBeTruthy();
                expect(err.message.indexOf("nothing was filtered from api-keys")).not.toBe(-1);
            }
            expect(result).toBeUndefined();
        });

        it("reconnects on not connected database when trying to get api key", async function() {
            await database.disconnect();
        
            let result = await database.getApiKey(existingApiKey);
            expect(result).toBeTruthy();
            expect(result.apiKey).toBe(existingApiKey);
        });
    });
});
