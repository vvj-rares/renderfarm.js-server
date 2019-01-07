"use strict";

import "reflect-metadata";

import { MongoClient, Db } from "mongodb";
import { injectable } from "inversify";
import { IDatabase } from "../interfaces"

import assert = require("assert");
import { WorkerInfo } from "../model/worker_info";
import { SessionInfo } from "../model/session_info";
import { WorkspaceInfo } from "../model/workspace_info";
import { JobInfo } from "../model/job_info";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { ApiKey } from "./model/api_key";

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

    async getApiKey(apiKey: string): Promise<ApiKey> {
        return new Promise<any>(function(resolve, reject) {
            if (apiKey) {
                let db = this._client.db(settings.databaseName);
                assert.notEqual(db, null);
        
                db.collection("api-keys").findOneAndUpdate(
                    { apiKey: apiKey }, 
                    { $set: { lastSeen : new Date() } },
                    { returnOriginal: false })
                    .then(function(obj){
                        if (obj.ok === 1 && obj.value) {
                            resolve(new ApiKey(obj.value));
                        } else {
                            reject("api key not found");
                        }
                    }.bind(this))
                    .catch(function(err){
                        reject(err);
                    }.bind(this));
            } else {
                reject("api key is empty");
            }
        }.bind(this));
    }

    async getWorkspace(workspaceGuid: string): Promise<WorkspaceInfo> {
        return new Promise<WorkspaceInfo>(function(resolve, reject) {

            if (workspaceGuid) {
                let db = this._client.db(settings.databaseName);
                assert.notEqual(db, null);
    
                db.collection("workspaces").findOneAndUpdate(
                    { guid: workspaceGuid, workgroup: settings.workgroup }, 
                    { $set: { lastSeen : new Date() } },
                    { returnOriginal: false })
                    .then(function(obj){
                        console.log(" >> workspace value: ", obj);
                        if (obj.value) {
                            let workspaceInfo = WorkspaceInfo.fromJSON(obj.value);
                            resolve(workspaceInfo);
                        } else {
                            reject();
                        }
                    }.bind(this))
                    .catch(function(err){
                        reject(err);
                    }.bind(this)); // end of db.collection("workspaces").findOneAndUpdate promise
    
            } else {
                reject();
            }
        }.bind(this));
    }

    async getSession(sessionGuid: string): Promise<SessionInfo> {
        return new Promise<SessionInfo>(function(resolve, reject) {
            if (sessionGuid) {
                let db = this._client.db(settings.databaseName);
                assert.notEqual(db, null);

                db.collection("sessions").findOneAndUpdate(
                    { guid: sessionGuid, closed: { $ne: true } },
                    { $set: { lastSeen : new Date() } },
                    { returnOriginal: false })
                    .then(function(obj) {
                        if (obj.value) {
                            let sessionInfo = SessionInfo.fromJSON(obj.value);
                            resolve(sessionInfo);
                        } else {
                            reject("session expired");
                        }

                    }.bind(this))
                    .catch(function(err) {
                        console.log(" >> failed to find session: ", err);
                        reject("failed to find session");
                    }.bind(this)); // end of db.collection("sessions").findOneAndUpdate promise
            } else {
                reject("session guid empty");
            }
        }.bind(this));
    }

    async expireSessions(): Promise<SessionInfo[]> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<SessionInfo[]>(function (resolve, reject) {
            // first expire sessions which have not been updated since 3 minutes
            let expirationDate = new Date(Date.now() - 3*60*1000); // 3*60*1000

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

    // assign free worker to given session
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
                        localField: "workerEndpoint",
                        foreignField: "endpoint",
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
                let busyWorkersEndpoints = res.map(s => s.worker.endpoint);
                console.log(" >> busyWorkersEndpoints: ", busyWorkersEndpoints);

                let recentOnlineDate = new Date(Date.now() - 2*1000); // pick the ones who were seen not less than 2 seconds ago

                //now find one worker, whose mac does not belong to busyWorkersMac
                db.collection("workers").find(
                    { 
                        endpoint: { $nin: busyWorkersEndpoints },
                        workgroup: { $eq: settings.workgroup },
                        lastSeen : { $gte: recentOnlineDate },
                    }
                ).sort({cpuUsage: 1}).limit(1).toArray()
                    .then(function(obj) {

                        console.log(" >> .sort({cpuUsage: 1}).limit(1).toArray() returned: \r\n", obj);

                        if (obj && obj.length === 1) {
                            let workerInfo = WorkerInfo.fromJSON(obj[0]);
                            let newSession = new SessionInfo(apiKey, sessionGuid, workerInfo.endpoint);
                            db.collection("sessions").insertOne(newSession.toDatabase())
                                .then(function(value){
                                    if (value.insertedCount === 1) {
                                        resolve({ session: newSession, worker: workerInfo });
                                    } else {
                                        reject(`failed to insert new session, insertedCount was ${value.insertedCount}`);
                                    }
                                }.bind(this))
                                .catch(function(err){
                                    console.error(err);
                                    reject(`failed to insert new session`);
                                }.bind(this)); // end of db.collection("sessions").insertOne promise

                        } else {
                            reject(`all workers are busy`);
                        }

                    }.bind(this))
                    .catch(function(err) {
                        console.error(err);
                        reject(`failed to query available workers`);
                        return
                    }.bind(this)); // end of db.collection("workers").find promise

            }.bind(this)); // end of db.collection("sessions").aggregate promise

        }.bind(this)); // return this promise
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
                        reject(`unable to find worker with mac ${workerInfo.mac} and port ${workerInfo.port}`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
        }.bind(this));
    }

    // find worker assigned to given session
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
                        localField: "workerEndpoint",
                        foreignField: "endpoint",
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

    async deleteDeadWorkers(): Promise<number> {
        let db = this._client.db("rfarmdb");
        assert.notEqual(db, null);

        return new Promise<number>(function (resolve, reject) {
            let expirationDate = new Date(Date.now() - 30*60*1000); // delete workers that are more than 30 minutes offline

            db.collection("workers").deleteMany(
                { 
                    lastSeen : { $lte: expirationDate }
                })
                .then(function(value){
                    if (value && value.deletedCount > 0) {
                        resolve(value.deletedCount);
                    } else {
                        resolve(0);
                    }
                }.bind(this))
                .catch(function(err){
                    reject(err);
                }.bind(this)); // end of db.collection("workers").deleteMany promise
        });
    }

    async storeVraySpawner(vraySpawnerInfo: VraySpawnerInfo): Promise<VraySpawnerInfo> {
        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        let vraySpawnerJson = vraySpawnerInfo.toDatabase();
        // console.log(" >> vraySpawnerJson: ", vraySpawnerJson);

        return new Promise<VraySpawnerInfo>(function (resolve, reject) {
            db.collection("vray-spawners").findOneAndUpdate(
                { mac: vraySpawnerInfo.mac, ip: vraySpawnerInfo.ip },
                { $set: vraySpawnerJson },
                { returnOriginal: false, upsert: true })
                .then(function(obj) {
                    if (obj.value) {
                        // console.log(" >> obj.value: ", obj.value);
                        resolve(VraySpawnerInfo.fromJSON(obj.value));
                    } else {
                        reject(`unable to find vray spawner with mac ${vraySpawnerInfo.mac} and ip ${vraySpawnerInfo.ip}`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
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

    //todo: this method is not tested
    async storeJob(jobInfo: JobInfo): Promise<JobInfo> {
        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        let jobJson = jobInfo.toDatabase();

        return new Promise<JobInfo>(function (resolve, reject) {
            db.collection("jobs").findOneAndUpdate(
                { guid: jobInfo.guid },
                { $set: jobJson },
                { returnOriginal: false, upsert: true })
                .then(function(obj) {
                    if (obj.value) {
                        resolve(WorkerInfo.fromJSON(obj.value));
                    } else {
                        reject(`unable to find job with guid ${jobInfo.guid}`);
                    }
                })
                .catch(function(err) {
                    reject(err);
                });
        }.bind(this));
    }

    //todo: this method is not tested
    async getJob(jobGuid: string): Promise<JobInfo> {
        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        return new Promise<JobInfo>(function (resolve, reject) {
            db.collection("jobs").findOne(
                { 
                    guid: jobGuid
                })
                .then(function(obj) {
                    if (obj) {
                        let jobInfo = JobInfo.fromJSON(obj);
                        resolve(jobInfo);
                    } else {
                        reject(`unable to find job with guid ${jobGuid}`);
                    }
                }.bind(this))
                .catch(function(err) {
                    console.error(err);
                    reject(`failed to query available workers`);
                    return
                }.bind(this)); // end of db.collection("jobs").findOne promise
        }.bind(this));
    }

    //todo: we need to kill pending and running jobs when session is expired or closed
    async getSessionActiveJobs(sessionGuid: string): Promise<JobInfo[]> {
        let db = this._client.db(settings.databaseName);
        assert.notEqual(db, null);

        return new Promise<JobInfo[]>(function (resolve, reject) {
            //todo: implement it
        });
    };
}

export { Database };
