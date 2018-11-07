import {} from 'jasmine';

import { myContainer } from "./inversify.config";
import { TYPES } from "./types";
import { Warrior, IDatabase } from "./interfaces";

const ninja = myContainer.get<Warrior>(TYPES.Warrior);
const database = myContainer.get<IDatabase>(TYPES.IDatabase);

describe("Database", function() {
  beforeEach(function() {
  });

  it("should resolve", function() {
    expect(database).toBeDefined();
  });

  describe("in context", function() {
    beforeEach(function() {
    });

    it("should sneak", function() {
      expect(ninja.sneak()).toEqual("hit!");
    });
  });
});
