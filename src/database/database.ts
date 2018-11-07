"use strict";

import { MongoClient, Db } from "mongodb";
import { injectable } from "inversify";
import { IDatabase } from "../interfaces"

import assert = require("assert");

@injectable()
class Database implements IDatabase {
    _db: Db;
    _url: String;
    _client: MongoClient;

    constructor() {
        this._db = null;
    }

    async connect(url: string): Promise<any> {
        this._url = url;
        this._client = new MongoClient(url, { useNewUrlParser: true });

        return new Promise(function(resolve, reject) {
            this._client.connect()
                .then(this.onConnected.bind(this))
                .then(resolve)
                .catch(reject);
        }.bind(this));
    }

    onConnected(client: MongoClient) {
        this._db = client.db("rfarmdb");
    }

    async getApiKey(apiKey: string) {
        assert.notEqual(this._db, null);

        let res = this._db.collection("api-keys").findOneAndUpdate(
            { key: apiKey }, 
            { $set: { lastSeen : (new Date()).toISOString() } },
            { returnOriginal: false });

        return res;
    }
}

export { Database };