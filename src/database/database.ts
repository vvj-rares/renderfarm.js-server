"use strict";

import { MongoClient, Db } from "mongodb";
import { injectable } from "inversify";
import { IDatabase } from "../interfaces"

import assert = require("assert");
import { Project } from "../model/project";

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

    async getProjects(apiKey: string): Promise<Project[]> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<Project[]>(function (resolve, reject) {
            db.collection("projects").find({ apiKey: apiKey }).toArray(function(err,arr) {
                if (err) 
                    reject(err);
                else {
                    resolve(arr.map(x => Project.fromJSON(x)));
                }
            });
        }.bind(this));
    }

    async getProject(apiKey: string, projectGuid: string): Promise<Project> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<Project>(function (resolve, reject) {
            db.collection("projects").findOneAndUpdate(
                { apiKey: apiKey, guid: projectGuid },
                { $set: { lastSeen : (new Date()).toISOString() } },
                { returnOriginal: false })
                .then(function(obj) {
                    if (obj.value) {
                        resolve(Project.fromJSON(obj.value));
                    } else {
                        reject(`unable to find project with guid ${projectGuid}`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
        }.bind(this));
    }

    async createProject(apiKey: string, name: string) {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise(function (resolve, reject) {
            let project = new Project(name);
            db.collection("projects").insertOne(project.toJSON(apiKey))
                .then(function(res) {
                    if (res.insertedCount === 1) {
                        resolve(Project.fromJSON(res.ops[0]));
                    } else {
                        reject(`insertedCount is returned ${res.insertedCount}, expected =1`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
        }.bind(this));
    }

    async updateProject(apiKey: string, project: Project): Promise<Project> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<Project>(function (resolve, reject) {
            project.touch();

            db.collection("projects").updateOne(
                { apiKey: apiKey, guid: project.guid },
                { $set: project.toJSON(apiKey) },
                { upsert: false }
            )
            .then(function(res) {
                if (res.modifiedCount === 1) {
                    resolve(true);
                } else {
                    reject(`modifiedCount is returned ${res.modifiedCount}, expected =1`);
                }
            })
            .catch(function(err) {
                reject(err);
            });
        }.bind(this));
    }

    async deleteProject(apiKey: string, projectGuid: string): Promise<any> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<Project>(function (resolve, reject) {

            db.collection("projects").deleteOne(
                { apiKey: apiKey, guid: projectGuid }
            )
            .then(function(res) {
                if (res.deletedCount === 1) {
                    resolve(true);
                } else {
                    reject(`deletedCount is returned ${res.deletedCount}, expected =1`);
                }
            })
            .catch(function(err) {
                reject(err);
            });

        }.bind(this));
    }
}

export { Database };