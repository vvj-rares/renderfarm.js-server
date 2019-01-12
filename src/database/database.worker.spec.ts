import "reflect-metadata";

import { Settings } from "../settings";
import { Database } from "./database";

require("../jasmine.config")();

describe("Database Worker", function() {
    var settings: Settings;
    var database: Database;

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

        fit("checks that recent workers belongs to current workgroup only", async function() {
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

        it("checks that expired session can not be closed", async function() {
        })
    }); // end of write tests
});
