"use strict";

import { MongoClient, Db } from "mongodb";
import { injectable } from "inversify";
import { IDatabase } from "../interfaces"

import assert = require("assert");
import { WorkerInfo } from "../model/worker_info";
import { SessionInfo } from "../model/session_info";
import { WorkspaceInfo } from "../model/workspace_info";

const settings = require("../settings");

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

    async getApiKey(apiKey: string): Promise<any> {
        if (apiKey) {

            let db = this._client.db(settings.databaseName);
            assert.notEqual(db, null);
    
            return db.collection("api-keys").findOneAndUpdate(
                { apiKey: apiKey }, 
                { $set: { lastSeen : new Date() } },
                { returnOriginal: false });
            
        } else {

            return new Promise<any>(function(resolve, reject) {
                reject();
            });
        }
    }

    async getWorkspace(workspaceGuid: string): Promise<any> {
        if (workspaceGuid) {
            let db = this._client.db(settings.databaseName);
            assert.notEqual(db, null);

            return db.collection("workspaces").findOneAndUpdate(
                { guid: workspaceGuid }, 
                { $set: { lastSeen : new Date() } },
                { returnOriginal: false });

        } else {

            return new Promise<any>(function(resolve, reject) {
                reject();
            });
        }
    }

    async expireSessions(): Promise<SessionInfo[]> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<SessionInfo[]>(function (resolve, reject) {
            // first expire sessions which have not been updated since 15 seconds
            let expirationDate = new Date(Date.now() - 15*1000); // 5*60*1000

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
                        { $set: { closed: true, closedAt: new Date(), abandoned: true } } )
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
        let db = this._client.db(settings.databaseName);
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

                let recentOnlineDate = new Date(Date.now() - 3*1000); // pick the ones who were seen not less than 3 seconds ago
                //now find one worker, whose mac does not belong to busyWorkersMac
                db.collection("workers").findOne(
                    { 
                        mac: { $nin: busyWorkersMac },
                        lastSeen : { $gte: recentOnlineDate },
                    })
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
                    }.bind(this))
                    .catch(function(err) {
                        console.error(err);
                        reject(`failed to query available workers`);
                        return
                    }.bind(this));

            }.bind(this));
        }.bind(this));
    }

    async storeWorker(workerInfo: WorkerInfo): Promise<WorkerInfo> {
        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        let workerJson = workerInfo.toDatabase();

        return new Promise<WorkerInfo>(function (resolve, reject) {
            db.collection("workers").findOneAndUpdate(
                { mac: workerInfo.mac, port: workerInfo.port },
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

    async getWorker(sessionGuid: string): Promise<WorkerInfo> {

        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        return new Promise<WorkerInfo>(function (resolve, reject) {
            if (sessionGuid === undefined || sessionGuid === "" || sessionGuid === null) {
                reject("getWorker: session id is empty");
            }

            // first find not closed sessions, and join each with corresponding workers
            db.collection("sessions").aggregate([
                {
                    $match: {
                        guid: sessionGuid
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
            ]).toArray(async function(err, res) {
                if (err) {
                    console.error(err);
                    reject(`getWorker: failed to find worker by session guid: ${sessionGuid}`);
                    return;
                }

                if (res.length > 1) {
                    console.error(`getWorker: found more than one session with guid: ${sessionGuid}`);
                }

                if (res.length === 0) {
                    console.log(`getWorker: session not found: ${sessionGuid}`);
                    resolve(undefined);
                }

                await db.collection("sessions").updateOne(
                    { guid: sessionGuid },
                    { $set: { lastSeen : new Date() } });

                let worker = WorkerInfo.fromJSON(res[0].worker);
                console.log(`getWorker: found a worker for session ${sessionGuid}: ${JSON.stringify(worker)}`);
                resolve(worker);
            }.bind(this));
        }.bind(this));
    }

    async assignSessionWorkspace(sessionGuid: string, workspaceGuid: string): Promise<boolean> {
        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        return new Promise<boolean>(function (resolve, reject) {

            db.collection("sessions").findOneAndUpdate(
                { guid : sessionGuid },
                { $set: { workspaceGuid: workspaceGuid, lastSeen : new Date() } },
                { returnOriginal: false })
                .then(function(obj) {
                    if (obj.value) {
                        resolve(true);
                    } else {
                        reject(`unable to find session with guid ${sessionGuid}`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    }

    async getSessionWorkspace(sessionGuid: string): Promise<WorkspaceInfo> {

        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        return new Promise<WorkspaceInfo>(function (resolve, reject) {
            if (sessionGuid === undefined || sessionGuid === "" || sessionGuid === null) {
                reject("getSessionWorkspace: session id is empty");
            }

            // first find not closed sessions, and join each with corresponding workspace
            db.collection("sessions").aggregate([
                {
                    $match: {
                        guid: sessionGuid
                    }
                },
                {
                    $lookup:
                      {
                        from: "workspaces",
                        localField: "workspaceGuid",
                        foreignField: "guid",
                        as: "workspace"
                      }
                },
                { 
                    $unwind : "$workspace" 
                }
            ]).toArray(async function(err, res) {
                if (err) {
                    console.error(err);
                    reject(`getSessionWorkspace: failed to find workspace by session guid: ${sessionGuid}`);
                    return;
                }

                if (res.length > 1) {
                    console.error(`getSessionWorkspace: found more than one session with guid: ${sessionGuid}`);
                }

                if (res.length === 0) {
                    console.log(`getSessionWorkspace: session not found: ${sessionGuid}`);
                    resolve(undefined);
                }

                //todo: extract to method touchSession(guid)
                await db.collection("sessions").updateOne(
                    { guid: sessionGuid },
                    { $set: { lastSeen : new Date() } });

                //todo: extract to method touchWorkspace(guid)
                await db.collection("workspaces").updateOne(
                    { guid: res[0].workspace.guid },
                    { $set: { lastSeen : new Date() } });
                
                let workspace = WorkspaceInfo.fromJSON(res[0].workspace);
                console.log(`getSessionWorkspace: found a workspace for session ${sessionGuid}: ${JSON.stringify(workspace)}`);
                resolve(workspace);
            }.bind(this));
        }.bind(this));
    }

    async closeSession(sessionGuid: string): Promise<boolean> {
        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        return new Promise<boolean>(function (resolve, reject) {

            db.collection("sessions").findOneAndUpdate(
                { guid : sessionGuid },
                { $set: { closed: true, closedAt: new Date() } },
                { returnOriginal: false })
                .then(function(obj) {
                    if (obj.value) {
                        resolve(true);
                    } else {
                        reject(`unable to find session with guid ${sessionGuid}`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
        });
    }
}

export { Database };