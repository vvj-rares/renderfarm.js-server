import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";
import { ApiKey } from "./model/api_key";
import { isError } from "util";
import { JasmineSpecHelpers } from "../jasmine.helpers";

require("../jasmine.config")();

describe("Database ApiKey", function() {
    var settings: Settings;
    var database: Database;
    var helpers: JasmineSpecHelpers;

    describe("read-only tests", function() {
        beforeEach(async function() {
            settings = new Settings("test");
            database = new Database(settings);
            helpers = new JasmineSpecHelpers(database, settings);
            try {
                await database.connect();
            } catch (err) {
                console.log(`beforeEach failed with error: ${err.message}`);
                fail();
            }
        });

        afterEach(async function() {
            try {
                await database.disconnect();
            } catch (err) {
                console.log(`afterEach failed with error: ${err.message}`);
            }
        })

        it("checks existing api key", async function(done) {
            let result: ApiKey = await database.getApiKey(helpers.existingApiKey);

            expect(result).toBeTruthy();
            expect(result.apiKey).toBe(helpers.existingApiKey);
            expect(result.userGuid).toBe(helpers.existingUserGuid);
            expect(new Date().getTime() - result.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
            done();
        });

        it("checks not existing api key", async function(done) {
            let result: ApiKey;
            try {
                result = await database.getApiKey("not-existing");
            } catch (err) {
                expect(isError(err)).toBeTruthy();
                expect(err.message).toMatch("nothing was updated in api-keys by \{.*?\}");
            }
            expect(result).toBeUndefined();
            done();
        });

        it("reconnects on not connected database when trying to get api key", async function(done) {
            try {
                await database.disconnect();
            } catch (err) {
                console.log(err.message);
                fail();
                return;
            }
        
            let result = await database.getApiKey(helpers.existingApiKey);
            expect(result).toBeTruthy();
            expect(result.apiKey).toBe(helpers.existingApiKey);
            done();
        });
    });
});
