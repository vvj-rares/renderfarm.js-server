"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inversify_config_1 = require("./inversify.config");
var types_1 = require("./types");
var ninja = inversify_config_1.myContainer.get(types_1.TYPES.Warrior);
var database = inversify_config_1.myContainer.get(types_1.TYPES.IDatabase);
describe("Database", function () {
    beforeEach(function () {
    });
    it("should resolve", function () {
        expect(database).toBeDefined();
    });
    describe("in context", function () {
        beforeEach(function () {
        });
        it("should sneak", function () {
            expect(ninja.sneak()).toEqual("hit!");
        });
    });
});
