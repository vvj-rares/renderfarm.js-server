"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var inversify_config_1 = require("./inversify.config");
var types_1 = require("./types");
var ninja = inversify_config_1.myContainer.get(types_1.TYPES.Warrior);
describe("ninja", function () {
    beforeEach(function () {
    });
    it("should fight", function () {
        expect(ninja.fight()).toEqual("cut!");
    });
    describe("in context", function () {
        beforeEach(function () {
        });
        it("should sneak", function () {
            expect(ninja.sneak()).toEqual("hit!");
        });
    });
});
