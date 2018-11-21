"use strict";

import { MongoClient, Db } from "mongodb";
import { injectable } from "inversify";
import { IDatabase } from "../interfaces"

import assert = require("assert");
import { Project } from "../model/project";
import { WorkerInfo } from "../model/worker_info";
import { SessionInfo } from "../model/session_info";

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

    async expireSessions(): Promise<SessionInfo[]> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<SessionInfo[]>(function (resolve, reject) {
            // first expire sessions which have not been updated since 5 minutes
            let expirationDate = new Date(Date.now() - 5*60*1000);

            db.collection("sessions").find(
                { 
                    lastSeen : { $lte: expirationDate },
                    closed: { $exists: false }
                })
                .toArray(function(err, res) {
                    if (err) {
                        console.error(err);
                        reject(`failed to find expiring sessions`);
                        return;
                    }

                    // now make a collection of busy mac addresses
                    let expiringSessions = res;

                    // now expire sessions
                    db.collection("sessions").updateMany(
                        { 
                            lastSeen: { $lte: expirationDate }, 
                            closed: { $exists: false } 
                        },
                        { $set: { closed: true, reason: "abandoned" } } )
                        .then(function(value){
                            if (value.result.nModified !== expiringSessions.length) {
                                console.warn(` WARN | number of expired sessions: ${expiringSessions.length}, actually expired: ${value.result.nModified}`);
                            }
                            resolve(expiringSessions);
                        }.bind(this))
                        .catch(function(err){
                            console.error(err);
                            reject("failed to expire abandoned sessions");
                        }.bind(this)); // end of  db.collection("sessions").updateMany promise

                }); // end of find
        });
    }

    async startWorkerSession(apiKey: string, sessionGuid: string): Promise<WorkerInfo> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<WorkerInfo>(function (resolve, reject) {
            // first find not closed sessions, and join each with corresponding workers
            db.collection("sessions").aggregate([
                {
                    $match: {
                        closed: {
                            $exists: false
                        }
                    }
                },
                {
                    $lookup:
                      {
                        from: "workers",
                        localField: "workerMac",
                        foreignField: "mac",
                        as: "worker"
                      }
                },
                { 
                    $unwind : "$worker" 
                }
            ]).toArray(function(err, res) {
                if (err) {
                    console.error(err);
                    reject(`failed to query open sessions`);
                    return;
                }

                // now make a collection of busy mac addresses
                let busyWorkersMac = res.map(s => s.worker.mac);

                //now find one worker, whose mac does not belong to busyWorkersMac
                db.collection("workers").findOne(
                    { mac: { $nin: busyWorkersMac } })
                    .then(function(obj) {

                        if (obj) {
                            let newSession = new SessionInfo(apiKey, sessionGuid, obj.mac);
                            db.collection("sessions").insertOne(newSession.toDatabase())
                                .then(function(value){
                                    if (value.insertedCount === 1) {
                                        resolve({ session: newSession, worker: WorkerInfo.fromJSON(obj) });
                                    } else {
                                        reject(`failed to insert new session, insertedCount was ${value.insertedCount}`);
                                    }
                                }.bind(this))
                                .catch(function(err){
                                    console.error(err);
                                    reject(`failed to insert new session`);
                                }.bind(this))
                        } else {
                            reject(`all workers are busy`);
                        }
                    })
                    .catch(function(err) {
                        console.error(err);
                        reject(`failed to query available workers`);
                        return
                    });

            });
        }.bind(this));
    }

    async storeWorker(workerInfo: WorkerInfo): Promise<WorkerInfo> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        let workerJson = workerInfo.toDatabase();

        return new Promise<WorkerInfo>(function (resolve, reject) {
            db.collection("workers").findOneAndUpdate(
                { mac: workerInfo.mac },
                { $set: workerJson },
                { returnOriginal: false, upsert: true })
                .then(function(obj) {
                    if (obj.value) {
                        resolve(WorkerInfo.fromJSON(obj.value));
                    } else {
                        reject(`unable to find worker with mac ${workerInfo.mac}`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
        }.bind(this));
    }
}

export { Database };