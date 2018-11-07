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

    connect(url: string, onSuccess: Function, onError: Function): void {
        this._url = url;
        this._client = new MongoClient(url, { useNewUrlParser: true });

        console.log("Connecting...");
        this._client.connect()
            .then(this.onConnected.bind(this, onSuccess))
            .catch(this.onFailedToConnect.bind(this, onError));
    }

    onConnected(callback: Function, client: MongoClient) {
        console.log("Successfully connected to database");
        this._db = client.db("rfarmdb");
        if (callback) callback(this._db);
    }

    onFailedToConnect(callback: Function, err: any) {
        console.error("Failed to connect to database");
        if (callback) callback(err);
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