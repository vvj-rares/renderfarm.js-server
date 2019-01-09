"use strict";

import "reflect-metadata";

import { MongoClient } from "mongodb";
import { injectable, inject } from "inversify";
import { IDatabase, ISettings } from "../interfaces"

import assert = require("assert");
import { WorkerInfo } from "../model/worker_info";
import { WorkspaceInfo } from "../model/workspace_info";
import { JobInfo } from "../model/job_info";
import { VraySpawnerInfo } from "../model/vray_spawner_info";
import { ApiKey } from "./model/api_key";
import { IDbEntity } from "./model/base/IDbEntity";
import { Workspace } from "./model/workspace";
import { Session } from "./model/session";
import { Worker } from "./model/worker";
import { TYPES } from "../types";

const uuidv4 = require('uuid/v4');

@injectable()
export class Database implements IDatabase {
    private _settings: ISettings;
    private _client: MongoClient;

    constructor(@inject(TYPES.ISettings) settings: ISettings) 
    {
        this._settings = settings;
    }

    //#region common methods
    public async connect(): Promise<any> {
        this._client = new MongoClient(this._settings.current.connectionUrl, { useNewUrlParser: true });
        return await this._client.connect();
    }

    public async disconnect(): Promise<any> {
        try {
            if (this._client && this._client.isConnected) {
                await this._client.close();
                delete this._client;
                return true;
            } else {
                return false;
            }
        } catch(err) {
            console.error(err);
            throw Error("failed to disconnect from database");
        }
    }

    public createCollections(): Promise<any> {
        return new Promise<any>(async function(resolve, reject) {
            try {
                let db = this._client.db(this._settings.current.databaseName);
                assert.notEqual(db, null);

                let collections = await db.listCollections().toArray();

                let users = this.envCollectionName("users"); 
                if (!collections.find(e => e.name === users)) {
                    await db.createCollection(users);
                }

                let apiKeys = this.envCollectionName("api-keys");
                if (!collections.find(e => e.name === apiKeys)) {
                    await db.createCollection(apiKeys);
                }

                let sessions = this.envCollectionName("sessions");
                if (!collections.find(e => e.name === sessions)) {
                    await db.createCollection(sessions);
                }

                let workspaces = this.envCollectionName("workspaces");
                if (!collections.find(e => e.name === workspaces)) {
                    await db.createCollection(workspaces);
                }

                let workers = this.envCollectionName("workers");
                if (!collections.find(e => e.name === workers)) {
                    await db.createCollection(workers);
                }

                let vraySpawners = this.envCollectionName("vray-spawners");
                if (!collections.find(e => e.name === vraySpawners)) {
                    await db.createCollection(vraySpawners);
                }

                let jobs = this.envCollectionName("jobs");
                if (!collections.find(e => e.name === jobs)) {
                    await db.createCollection(jobs);
                }

                resolve();
            } catch (err) {
                reject(err);
            }
        }.bind(this));
    }

    public dropCollections(): Promise<any> {
        return new Promise<any>(async function(resolve, reject) {
            try {
                let db = this._client.db(this._settings.current.databaseName);
                assert.notEqual(db, null);

                let collections = await db.listCollections().toArray();

                let users = this.envCollectionName("users"); 
                if (collections.find(e => e.name === users)) {
                    await db.collection(users).drop();
                }

                let apiKeys = this.envCollectionName("api-keys");
                if (collections.find(e => e.name === apiKeys)) {
                    await db.collection(apiKeys).drop();
                }

                let sessions = this.envCollectionName("sessions");
                if (collections.find(e => e.name === sessions)) {
                    await db.collection(sessions).drop();
                }

                let workspaces = this.envCollectionName("workspaces");
                if (collections.find(e => e.name === workspaces)) {
                    await db.collection(workspaces).drop();
                }

                let workers = this.envCollectionName("workers");
                if (collections.find(e => e.name === workers)) {
                    await db.collection(workers).drop();
                }

                let vraySpawners = this.envCollectionName("vray-spawners");
                if (collections.find(e => e.name === vraySpawners)) {
                    await db.collection(vraySpawners).drop();
                }

                let jobs = this.envCollectionName("jobs");
                if (collections.find(e => e.name === jobs)) {
                    await db.collection(jobs).drop();
                }

                resolve();
            } catch (err) {
                reject(err);
            }
        }.bind(this));
    }

    public async dropAllCollections(regex: RegExp): Promise<number> {
        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let collections = await db.listCollections().toArray();

        let count = 0;
        for (let k in collections) {
            let name = collections[k].name;
            if (regex.test(name)) {
                await db.collection(name).drop();
                ++ count;
            }
        }

        return count;
    }
    //#endregion

    //#region Api Keys
    public getApiKey(apiKey: string): Promise<ApiKey> {
        return this.getOneAndUpdate<ApiKey>(
            "api-keys", 
            { apiKey: apiKey },
            { lastSeen: new Date() },
            (obj) => new ApiKey(obj));
    }
    //#endregion

    //#region Sessions
    public async getSession(sessionGuid: string): Promise<Session> {
        let session = await this.getOneAndUpdate<Session>(
            "sessions", 
            { guid: sessionGuid, closed: { $ne: true } },
            { lastSeen: new Date() },
            (obj) => new Session(obj));

        session.workerRef = await this.getOne<Worker>(
            "workers", 
            { 
                guid: session.workerGuid 
            }, 
            obj => new Worker(obj));

        return session;
    }

    public createSession(apiKey: string, workspaceGuid: string): Promise<Session> {
        //todo: get rid of Promise here
        return new Promise<Session>(async function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            // pick only the workers who were seen not less than 2 seconds ago
            let workers = await this.getAvailableWorkers();

            // this will prevent multiple worker assignment, if top most worker was set busy = true,
            // then we just pick underlying least loaded worker.
            for(let wi in workers) {
                let candidate = workers[wi];
                let createdSession = await this.tryCreateSessionAtWorker(apiKey, workspaceGuid, candidate);
                if (createdSession) {
                    resolve(createdSession);
                    return;
                }
            }

            reject("all workers busy");

        }.bind(this)); // return this promise
    }

    private async tryCreateSessionAtWorker(apiKey: string, workspaceGuid: string, candidate: Worker): Promise<Session> {
        try {
            let recentOnlineDate = new Date(Date.now() - 2 * 1000);
            let filter: any = { 
                workgroup: this._settings.current.workgroup,
                lastSeen : { $gte: recentOnlineDate },
                sessionGuid: { $eq: null },
                guid: candidate.guid
            };
            let sessionGuid = uuidv4();
            let setter: any = { $set: { 
                sessionGuid: sessionGuid, 
                lastSeen: new Date() 
            } };

            let self = this as Database;
            let caputuredWorker = await self.findOneAndUpdate<Worker>("workers", filter, setter, (obj: any) => new Worker(obj));

            let session = new Session(null);
            session.apiKey = apiKey;
            session.guid = sessionGuid;
            session.firstSeen = new Date();
            session.lastSeen = session.firstSeen;
            session.workerGuid = caputuredWorker.guid;
            session.workspaceGuid = workspaceGuid;

            let result = await self.insertOne<Session>("sessions", session, obj => new Session(obj));
            result.workerRef = caputuredWorker;
            return result;
        } catch {
            return undefined;
        }
    }

    public async closeSession(sessionGuid: string): Promise<Session> {
        let closedSession = await this.findOneAndUpdate<Session>(
            "sessions",
            {
                guid: sessionGuid,
                closedAt: { $eq: null }
            },
            {
                $set: {
                    closed: true, 
                    closedAt: new Date()
                }
            },
            obj => new Session(obj));
        
        if (!closedSession) {
            throw Error("open session with given guid does not exist, possibly session was expired");
        }

        closedSession.workerRef = await this.findOneAndUpdate<Worker>(
            "workers", 
            {
                guid: closedSession.workerGuid
            },
            {
                $set: {
                    sessionGuid: null
                }
            }, 
            obj => new Worker(obj));

        return closedSession;
    }

    public expireSessions(olderThanMinutes: number): Promise<Session[]> {
        let expirationDate = new Date(Date.now() - olderThanMinutes * 60*1000);
        let filter = { 
            lastSeen : { $lte: expirationDate },
            closed: { $eq: null }
        };
        let setter = { $set: { closed: true, closedAt: new Date(), abandoned: true } };
        return this.updateMany<Session>("sessions", filter, setter, obj => new Session(obj));
    }
    //#endregion

    //#region Workspaces
    public getWorkspace(workspaceGuid: string): Promise<Workspace> {
        return this.getOneAndUpdate<Workspace>(
            "workspaces", 
            { guid: workspaceGuid, workgroup: this._settings.current.workgroup },
            { lastSeen: new Date() },
            (obj) => new Workspace(obj));
    }

    public assignSessionWorkspace(sessionGuid: string, workspaceGuid: string): Promise<boolean> {
        //todo: get rid off Promise here
        return new Promise<boolean>(function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            db.collection(this.envCollectionName("sessions")).findOneAndUpdate(
                { guid : sessionGuid },
                { $set: { workspaceGuid: workspaceGuid, lastSeen : new Date() } },
                { returnOriginal: false })
                .then(function(obj) {
                    if (obj.value) {
                        resolve(true);
                    } else {
                        reject(`unable to find session with guid ${sessionGuid}`);
                    }
                }.bind(this))
                .catch(function(err) {
                    reject(err);
                }.bind(this));
        }.bind(this));
    }

    public getSessionWorkspace(sessionGuid: string): Promise<WorkspaceInfo> {
        //todo: get rid off Promise here
        return new Promise<WorkspaceInfo>(function (resolve, reject) {
            if (sessionGuid === undefined || sessionGuid === "" || sessionGuid === null) {
                reject("getSessionWorkspace: session id is empty");
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            // first find not closed sessions, and join each with corresponding workspace
            db.collection(this.envCollectionName("sessions")).aggregate([
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
                await db.collection(this.envCollectionName("sessions")).updateOne(
                    { guid: sessionGuid },
                    { $set: { lastSeen : new Date() } });

                //todo: extract to method touchWorkspace(guid)
                await db.collection(this.envCollectionName("workspaces")).updateOne(
                    { guid: res[0].workspace.guid },
                    { $set: { lastSeen : new Date() } });
                
                let workspace = WorkspaceInfo.fromJSON(res[0].workspace);
                console.log(`getSessionWorkspace: found a workspace for session ${sessionGuid}: ${JSON.stringify(workspace)}`);
                resolve(workspace);
            }.bind(this));
        }.bind(this));
    }
    //#endregion

    //#region Workers
    public getAvailableWorkers(): Promise<Worker[]> {
        //todo: get rid off Promise here
        return new Promise<Worker[]>(function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            let recentOnlineDate = new Date(Date.now() - 2 * 1000);
            db.collection(this.envCollectionName("workers")).find({ 
                workgroup: { $eq: this._settings.current.workgroup },
                lastSeen : { $gte: recentOnlineDate },
                sessionGuid: { $eq: null }
            }).sort({
                cpuUsage: 1 //sort by cpu load, less loaded first
            }).toArray().then(function(arr: any[]){
                let workers: Worker[] = arr.map(e => new Worker(e));
                resolve(workers);
            }.bind(this)).catch(function(err){
                reject(err);
            }.bind(this));
        }.bind(this));
    }

    public storeWorker(worker: Worker): Promise<boolean> {
        return this.updateOne<Worker>("workers", worker, true);
    }

    public updateWorker(worker: Worker): Promise<Worker> {
        return this.findOneAndUpdate<Worker>("workers", worker.filter, worker.toJSON(), obj => new Worker(obj));
    }

    public getWorker(sessionGuid: string): Promise<WorkerInfo> {
        //todo: get rid off Promise here
        return new Promise<WorkerInfo>(function (resolve, reject) {
            if (sessionGuid === undefined || sessionGuid === "" || sessionGuid === null) {
                reject("getWorker: session id is empty");
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            // first find not closed sessions, and join each with corresponding workers
            db.collection(this.envCollectionName("sessions")).aggregate([
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

                await db.collection(this.envCollectionName("sessions")).updateOne(
                    { guid: sessionGuid },
                    { $set: { lastSeen : new Date() } });

                let worker = WorkerInfo.fromJSON(res[0].worker);
                console.log(`getWorker: found a worker for session ${sessionGuid}: ${JSON.stringify(worker)}`);
                resolve(worker);
            }.bind(this));
        }.bind(this));
    }

    public deleteDeadWorkers(): Promise<number> {
        //todo: get rid off Promise here
        return new Promise<number>(function (resolve, reject) {
            let expirationDate = new Date(Date.now() - 30*60*1000); // delete workers that are more than 30 minutes offline

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            db.collection(this.envCollectionName("workers")).deleteMany(
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
                }.bind(this)); // end of db.collection(this.envCollectionName("workers").deleteMany promise
        }.bind(this));
    }
    //#endregion

    //#region Vray spawners
    public storeVraySpawner(vraySpawnerInfo: VraySpawnerInfo): Promise<VraySpawnerInfo> {
        //todo: get rid off Promise here
        return new Promise<VraySpawnerInfo>(function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            db.collection(this.envCollectionName("vray-spawners")).findOneAndUpdate(
                { mac: vraySpawnerInfo.mac, ip: vraySpawnerInfo.ip },
                { $set: vraySpawnerInfo.toDatabase() },
                { returnOriginal: false, upsert: true })
                .then(function(obj) {
                    if (obj.value) {
                        // console.log(" >> obj.value: ", obj.value);
                        resolve(VraySpawnerInfo.fromJSON(obj.value));
                    } else {
                        reject(`unable to find vray spawner with mac ${vraySpawnerInfo.mac} and ip ${vraySpawnerInfo.ip}`);
                    }
                }.bind(this))
                .catch(function(err) {
                    reject(err);
                }.bind(this));
        }.bind(this));
    }
    //#endregion

    //#region Jobs
    public storeJob(jobInfo: JobInfo): Promise<JobInfo> {
        //todo: get rid off Promise here
        return new Promise<JobInfo>(function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            let jobJson = jobInfo.toDatabase();
    
            db.collection(this.envCollectionName("jobs")).findOneAndUpdate(
                { guid: jobInfo.guid },
                { $set: jobJson },
                { returnOriginal: false, upsert: true })
                .then(function(obj) {
                    if (obj.value) {
                        resolve(WorkerInfo.fromJSON(obj.value));
                    } else {
                        reject(`unable to find job with guid ${jobInfo.guid}`);
                    }
                }.bind(this))
                .catch(function(err) {
                    reject(err);
                }.bind(this));
        }.bind(this));
    }

    public getJob(jobGuid: string): Promise<JobInfo> {
        //todo: get rid off Promise here
        return new Promise<JobInfo>(function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            db.collection(this.envCollectionName("jobs")).findOne(
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
                }.bind(this)); // end of db.collection(this.envCollectionName("jobs").findOne promise
        }.bind(this));
    }

    public getSessionActiveJobs(sessionGuid: string): Promise<JobInfo[]> {
        //todo: get rid off Promise here
        return new Promise<JobInfo[]>(function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            //todo: implement it
        }.bind(this));
    }
    //#endregion

    //#region internal methods, i.e. does not belong to IDatabase
    public getOne<T extends IDbEntity>(collection: string, filter: any, ctor: (obj: any) => T): Promise<T> {
        //todo: get rid off Promise here
        return new Promise<T>(function(resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            db.collection(this.envCollectionName(collection))
                .findOne(filter)
                .then(function(obj){
                    if (obj) {
                        resolve(ctor(obj));
                    } else {
                        reject(`nothing was filtered from ${collection} by ${JSON.stringify(filter)}`);
                    }
                }.bind(this))
                .catch(function(err){
                    reject(err);
                }.bind(this));
        }.bind(this));
    }

    public async getOneAndUpdate<T extends IDbEntity>(collection: string, filter: any, setter: any, ctor: (obj: any) => T): Promise<T> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let obj = await db.collection(this.envCollectionName(collection)).findOneAndUpdate(
            filter,
            { $set: setter },
            { returnOriginal: false });

        if (obj.ok === 1 && obj.value) {
            return ctor(obj.value);
        } else {
            throw Error(`nothing was filtered from ${collection} by ${JSON.stringify(filter)}`);
        }
    }

    public insertOne<T extends IDbEntity>(collection: string, entity: IDbEntity, ctor: (obj: any) => T): Promise<T> {
        //todo: get rid off Promise here
        return new Promise<T>(function(resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            db.collection(this.envCollectionName(collection)).insertOne(entity.toJSON())
                .then(function(obj){
                    if (obj.result.ok === 1 && obj.insertedCount === 1) {
                        resolve(ctor(obj.ops[0]));
                    } else {
                        reject(`failed to insert in ${collection}`);
                    }
                }.bind(this))
                .catch(function(err){
                    reject(err);
                }.bind(this));
        }.bind(this));
    }

    public findOneAndUpdate<T extends IDbEntity>(collection: string, filter: any, setter: any, ctor: (obj: any) => T): Promise<T> {
        //todo: get rid off Promise here
        return new Promise<T>(function(resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            db.collection(this.envCollectionName(collection)).findOneAndUpdate(
                filter, // like { apiKey: apiKey }
                setter,
                { returnOriginal: false })
                .then(function(obj){
                    if (obj.ok === 1 && obj.value) {
                        resolve(ctor(obj.value));
                    } else {
                        reject(`nothing was filtered from ${collection} by ${JSON.stringify(filter)}`);
                    }
                }.bind(this))
                .catch(function(err){
                    reject(err);
                }.bind(this));
        }.bind(this));
    }

    public updateOne<T extends IDbEntity>(collection: string, obj: T, upsert: boolean): Promise<boolean> {
        //todo: get rid off Promise here
        return new Promise<boolean>(function(resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            db.collection(this.envCollectionName(collection)).updateOne(
                obj.filter,
                { $set: obj.toJSON() },
                { upsert: upsert })
                .then(function(obj){
                    // result: { ok: 1, nModified: 0, n: 1, upserted: [ [Object] ] },
                    if (obj && obj.result && obj.result.ok === 1 && obj.result.n > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }.bind(this))
                .catch(function(err){
                    reject(err);
                }.bind(this));
        }.bind(this));
    }

    public updateMany<T extends IDbEntity>(collection: string, filter: any, setter: any, ctor: (obj: any) => T): Promise<T[]> {
        //todo: get rid off Promise here
        return new Promise<T[]>(function (resolve, reject) {
            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            let trans = uuidv4();
            setter.$set._trans = trans; //remember transaction

            db.collection(this.envCollectionName(collection)).updateMany(
                filter,
                setter)
                .then(function(value){
                    if (value.matchedCount > 0 && value.modifiedCount > 0) {
                        // query updated documents with given transaction
                        db.collection(this.envCollectionName(collection)).find({ _trans: trans })
                            .toArray()
                            .then(function(value){
                                let updated = value.map(e => ctor(e));
                                resolve(updated);
                            }.bind(this))
                            .catch(function(err){
                                reject(err);
                            }.bind(this));
                    } else {
                        resolve([]);
                    }
                }.bind(this))
                .catch(function(err){
                    reject(err);
                }.bind(this));
        }.bind(this));
    }

    public async ensureClientConnection() {
        if (!this._client || !this._client.isConnected) {
            await this.connect();
        }
    }

    public envCollectionName(name: string) {
        return `${this._settings.current.collectionPrefix}-${name}`;
    }
    //#endregion
}
