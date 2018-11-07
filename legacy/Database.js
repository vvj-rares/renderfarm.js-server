"use strict";

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

class Database {
    constructor() {
        this._rfarmdb = null;
    }

    connect(url, onSuccess, onError) {
        this._url = url;

        this._client = new MongoClient(url);
        this._client.connect(function(err,db) {
            if (err) {
                if (onError) return onError(err);
            }

            this._rfarmdb = db.db("rfarmdb");
            if (onSuccess) return onSuccess(this._rfarmdb);
        });
    }

    get db() {
        return this._rfarmdb;
    }
}

module.exports = Database;