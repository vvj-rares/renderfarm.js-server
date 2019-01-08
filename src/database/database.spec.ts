import "reflect-metadata";

import { ISettings, IDatabase } from "../interfaces";
import { Settings } from "../settings";
import { Database } from "./database";
import { ApiKey } from "./model/api_key";

describe("Database", function() {
    var settings: ISettings;
    var database: IDatabase;

    beforeEach(function() {
        settings = new Settings("test");
        database = new Database(settings);
    });

    it("should connect", async function() {
        await database.connect();
        let result: ApiKey = await database.getApiKey("0000-0001");

        expect(result).toBeTruthy();
        expect(result.apiKey).toBe("0000-0001");
        expect(result.userGuid).toBe("00000000-0000-0000-0000-000000000001");
        expect(new Date().getTime() - result.lastSeen.getTime()).toBeLessThan(3000); // db time minus now is less than 3 seconds
    });
});
