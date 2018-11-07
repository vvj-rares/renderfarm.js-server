"use strict";

import { MongoClient, Db } from "mongodb";
import { injectable } from "inversify";
import { IDatabase } from "../interfaces"

import assert = require("assert");

@injectable()
class Database implements IDatabase {
    _url: String;
    _client: MongoClient;

    constructor() {
    }

    async connect(url: string): Promise<any> {
        this._url = url;
        this._client = new MongoClient(url, { useNewUrlParser: true });

        return new Promise(function(resolve, reject) {
            this._client.connect()
                .then(resolve)
                .catch(reject);
        }.bind(this));
    }

    async getApiKey(apiKey: string) {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return db.collection("api-keys").findOneAndUpdate(
            { apiKey: apiKey }, 
            { $set: { lastSeen : (new Date()).toISOString() } },
            { returnOriginal: false });
    }

    async getProjects(apiKey: string) {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise(function (resolve, reject) {
            let res = db.collection("projects").find({ apiKey: apiKey });
            res.toArray(function(err,arr) {
                if (err) 
                    reject(err);
                else {
                    let projects = [];
                    for (let p in arr) {
                        // convert data model
                        projects.push({
                            guid: arr[p].guid,
                            name: arr[p].name,
                            createdAt: arr[p].createdAt,
                            lastSeen: arr[p].lastSeen
                        })
                    }
                    resolve(projects);
                }
            });
        }.bind(this));
    }
}

export { Database };