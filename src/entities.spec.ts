import {} from 'jasmine';

import { myContainer } from "./inversify.config";
import { TYPES } from "./types";
import { Warrior } from "./interfaces";

const ninja = myContainer.get<Warrior>(TYPES.Warrior);

describe("ninja", function() {
  beforeEach(function() {
  });

  it("should fight", function() {
    expect(ninja.fight()).toEqual("cut!");
  });

  describe("in context", function() {
    beforeEach(function() {
    });

    it("should sneak", function() {
      expect(ninja.sneak()).toEqual("hit!");
    });
  });
});
