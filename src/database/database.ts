"use strict";

import "reflect-metadata";

import { MongoClient, CollectionInsertOneOptions, InsertOneWriteOpResult, MongoCallback, MongoError, FindOneAndUpdateOption, FindAndModifyWriteOpResultObject, UpdateOneOptions, UpdateWriteOpResult, UpdateManyOptions } from "mongodb";
import { injectable, inject } from "inversify";
import { IDatabase, ISettings, IGetSessionOptions } from "../interfaces"

import assert = require("assert");
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
        try {
            this._client = new MongoClient(this._settings.current.connectionUrl, { useNewUrlParser: true });
            return await this._client.connect();
        } catch (err) {
            this._client = null;
            throw Error(`failed to disconnect from database, ${err.message}`);
        }
    }

    public async disconnect(): Promise<any> {
        try {
            if (this._client && this._client.isConnected) {
                await this._client.close();
                this._client = null;
                return true;
            } else {
                return false;
            }
        } catch(err) {
            throw Error(`failed to disconnect from database, ${err.message}`);
        }
    }

    public async createCollections(): Promise<any> {
        if (!this._client) throw Error("database not connected");
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
    }

    public async dropCollections(): Promise<any> {
        if (!this._client) throw Error("database not connected");
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
    }

    public async dropAllCollections(regex: RegExp): Promise<number> {
        if (!this._client) throw Error("database not connected");
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
    public async getApiKey(apiKey: string): Promise<ApiKey> {
        return await this.findOneAndUpdate<ApiKey>(
            "api-keys", 
            { apiKey: apiKey },
            { $set: { lastSeen: new Date() } },
            (obj) => new ApiKey(obj));
    }
    //#endregion

    //#region Sessions
    public async getSession(sessionGuid: string, options?: IGetSessionOptions): Promise<Session> {

        let filter: any = { guid: sessionGuid, closed: { $ne: true } };
        let setter: any = { $set: { lastSeen: new Date() } };

        //todo: spec is required, test how options work
        if (options && options.allowClosed) {
            delete filter.closed;
        }

        let session: Session;
        if (options && options.readOnly) {
            session = await this.getOne<Session>(
                "sessions", 
                filter,
                (obj) => new Session(obj));
        } else {
            session = await this.findOneAndUpdate<Session>(
                "sessions", 
                filter,
                setter,
                (obj) => new Session(obj));
        }

        try {
            session.workerRef = await this.getOne<Worker>(
                "workers", 
                { 
                    guid: session.workerGuid 
                }, 
                obj => new Worker(obj));
        } catch (err) {
            // well, workers are not guaranteed to exist
        }

        return session;
    }

    public async createSession(apiKey: string, workspaceGuid: string): Promise<Session> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let workspace = await this.getWorkspace(workspaceGuid);

        // pick only the workers who were seen not less than 2 seconds ago
        let workers = await this.getAvailableWorkers();

        // this will prevent multiple worker assignment, if top most worker was set busy = true,
        // then we just pick underlying least loaded worker.
        for(let wi in workers) {
            let candidate = workers[wi];
            let createdSession = await this.tryCreateSessionAtWorker(apiKey, workspace, candidate);
            if (createdSession) {
                return createdSession;
            }
        }

        throw Error("all workers busy");
    }

    private async tryCreateSessionAtWorker(apiKey: string, workspace: Workspace, candidate: Worker): Promise<Session> {
        try {
            let filter: any = {
                guid: candidate.guid,
                sessionGuid: { $eq: null }
            };
            let sessionGuid = uuidv4();
            let setter: any = { $set: { 
                sessionGuid: sessionGuid
            }};

            let caputuredWorker = await this.findOneAndUpdate<Worker>("workers", filter, setter, (obj: any) => new Worker(obj));

            let session = new Session(null);
            session.apiKey = apiKey;
            session.guid = sessionGuid;
            session.firstSeen = new Date();
            session.lastSeen = session.firstSeen;
            session.workerGuid = caputuredWorker.guid;
            session.workspaceGuid = workspace.guid;

            let result = await this.insertOne<Session>("sessions", session, obj => new Session(obj));
            result.workerRef = caputuredWorker;
            result.workspaceRef = workspace;
            return result;
        } catch {
            return undefined;
        }
    }

    public async closeSession(sessionGuid: string, reason?: string | undefined): Promise<Session> {
        let closedAt = new Date();
        let closedSession = await this.safe(this.findOneAndUpdate<Session>(
                "sessions",
                {
                    guid: sessionGuid,
                    closedAt: null
                },
                {
                    $set: {
                        closed: true, 
                        closedAt: closedAt,
                        lastSeen: closedAt,
                        reason: reason
                    }
                },
                obj => new Session(obj)));

        if (!closedSession) {
            throw Error("session not found");
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

    public async expireSessions(olderThanMinutes: number): Promise<Session[]> {
        let expirationDate = new Date(Date.now() - olderThanMinutes * 60*1000);
        let filter = { 
            lastSeen : { $lte: expirationDate },
            closed: null
        };
        let setter = { $set: { closed: true, closedAt: new Date(), expired: true } };
        let expiredSessions = await this.findManyAndUpdate<Session>("sessions", filter, setter, obj => new Session(obj));
        if (expiredSessions.length === 0) {
            return [];
        }

        let workerUpdateFilter = { $or: [] };
        for (let si in expiredSessions) {
            let session = expiredSessions[si];
            workerUpdateFilter.$or.push({guid: session.workerGuid});
        }

        let updatedWorkers = await this.findManyAndUpdate(
            "workers", 
            workerUpdateFilter, 
            { $set: { sessionGuid: null } }, 
            obj => new Worker(obj));

        for (let si in expiredSessions) {
            let session = expiredSessions[si];
            session.workerRef = updatedWorkers.find(e => e.guid === session.workerGuid);
        }

        return expiredSessions;
    }
    //#endregion

    //#region Workspaces
    public async getWorkspace(workspaceGuid: string): Promise<Workspace> {
        return await this.findOneAndUpdate<Workspace>(
            "workspaces", 
            { guid: workspaceGuid, workgroup: this._settings.current.workgroup },
            { $set: { lastSeen: new Date() } },
            (obj) => new Workspace(obj));
    }
    //#endregion

    //#region Workers
    public async getWorker(workerGuid: string): Promise<Worker> {
        return await this.getOne<Worker>(
                "workers", 
                { guid: workerGuid },
                (obj) => new Worker(obj));
    }

    public async getRecentWorkers(): Promise<Worker[]> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let filter = { 
            workgroup: this._settings.current.workgroup
        };

        let result = await db.collection(this.envCollectionName("workers"))
        .find(filter)
        .sort({
            cpuUsage: 1 //sort by cpu load, less loaded first
        }).toArray();

        return result.map(e => new Worker(e));
    }

    public async getAvailableWorkers(): Promise<Worker[]> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let recentOnlineDate = new Date(Date.now() - 2 * 1000);
        let result = await db.collection(this.envCollectionName("workers")).find({ 
            workgroup: this._settings.current.workgroup,
            lastSeen : { $gte: recentOnlineDate },
            sessionGuid: null
        }).sort({
            cpuUsage: 1 //sort by cpu load, less loaded first
        }).toArray();

        return result.map(e => new Worker(e));
    }

    public insertWorker(worker: Worker): Promise<Worker> {
        return this.insertOne<Worker>("workers", worker, obj => new Worker(obj));
    }

    public upsertWorker(worker: Worker): Promise<boolean> {
        return this.upsertOne("workers", worker);
    }

    public updateWorker(worker: Worker, setter: any): Promise<Worker> {
        return this.findOneAndUpdate<Worker>("workers", worker.filter, setter, obj => new Worker(obj));
    }

    public deleteWorker(worker: Worker): Promise<Worker> {
        return this.findOneAndDelete("workers", worker.filter, obj => new Worker(obj));
    }

    public async deleteDeadWorkers(): Promise<number> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let expirationDate = new Date(Date.now() - 30*1000); // delete workers that are more than 30 seconds offline
        let result = await db.collection(this.envCollectionName("workers")).deleteMany(
            { 
                lastSeen : { $lte: expirationDate }
            });

        return result.deletedCount;
    }
    //#endregion

    //#region Vray spawners
    //public async storeVraySpawner(vraySpawnerInfo: VraySpawnerInfo): Promise<VraySpawnerInfo> {
        // let db = this._client.db(this._settings.current.databaseName);
        // assert.notEqual(db, null);

        // let result = await db.collection(this.envCollectionName("vray-spawners")).findOneAndUpdate(
        //     { mac: vraySpawnerInfo.mac, ip: vraySpawnerInfo.ip },
        //     { $set: vraySpawnerInfo.toDatabase() },
        //     { returnOriginal: false, upsert: true });

        // if (result.value) {
        //     resolve(VraySpawnerInfo.fromJSON(obj.value));
        // } else {
        //     reject(`unable to find vray spawner with mac ${vraySpawnerInfo.mac} and ip ${vraySpawnerInfo.ip}`);
        // }
    //}
    //#endregion

    //#region Jobs
    //public async storeJob(jobInfo: JobInfo): Promise<JobInfo> {
        // throw Error("storeJob not implemented");
        // let db = this._client.db(this._settings.current.databaseName);
        // assert.notEqual(db, null);

        // let jobJson = jobInfo.toDatabase();

        // db.collection(this.envCollectionName("jobs")).findOneAndUpdate(
        //     { guid: jobInfo.guid },
        //     { $set: jobJson },
        //     { returnOriginal: false, upsert: true })
        //     .then(function(obj) {
        //         if (obj.value) {
        //             // resolve(WorkerInfo.fromJSON(obj.value));
        //         } else {
        //             // reject(`unable to find job with guid ${jobInfo.guid}`);
        //         }
        //     }.bind(this))
        //     .catch(function(err) {
        //         // reject(err);
        //     }.bind(this));
    //}

    //public getJob(jobGuid: string): Promise<JobInfo> {
        //todo: get rid off Promise here
        // return new Promise<JobInfo>(function (resolve, reject) {
        //     let db = this._client.db(this._settings.current.databaseName);
        //     assert.notEqual(db, null);

        //     db.collection(this.envCollectionName("jobs")).findOne(
        //         { 
        //             guid: jobGuid
        //         })
        //         .then(function(obj) {
        //             if (obj) {
        //                 let jobInfo = JobInfo.fromJSON(obj);
        //                 resolve(jobInfo);
        //             } else {
        //                 reject(`unable to find job with guid ${jobGuid}`);
        //             }
        //         }.bind(this))
        //         .catch(function(err) {
        //             console.error(err);
        //             reject(`failed to query available workers`);
        //             return
        //         }.bind(this)); // end of db.collection(this.envCollectionName("jobs").findOne promise
        // }.bind(this));
    //}

    //public getSessionActiveJobs(sessionGuid: string): Promise<JobInfo[]> {
        //todo: get rid off Promise here
        // return new Promise<JobInfo[]>(function (resolve, reject) {
        //     let db = this._client.db(this._settings.current.databaseName);
        //     assert.notEqual(db, null);

        //     //todo: implement it
        // }.bind(this));
    //}
    //#endregion

    //#region internal methods, i.e. does not belong to IDatabase
    public async getOne<T extends IDbEntity>(collection: string, filter: any, ctor: (obj: any) => T): Promise<T> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let obj = await db.collection(this.envCollectionName(collection)).findOne(filter);
        if (obj) {
            return ctor(obj);
        } else {
            return null;
        }
    }

    public async find<T extends IDbEntity>(collection: string, filter: any, ctor: (obj: any) => T): Promise<T[]> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let arr = await db.collection(this.envCollectionName(collection)).find(filter).toArray();

        return arr.map(e => ctor(e)) 
    }

    public findOneAndUpdate<T extends IDbEntity>(collection: string, filter: any, setter: any, ctor: (obj: any) => T): Promise<T> {
        return new Promise<T>(async function(resolve, reject){
            try {
                await this.ensureClientConnection();
            } catch (err) {
                reject(err);
                return;
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            let opt: FindOneAndUpdateOption = { w: "majority", j: true, returnOriginal: false, upsert: false };

            let callback: MongoCallback<FindAndModifyWriteOpResultObject> = function (error: MongoError, res: FindAndModifyWriteOpResultObject) {
                if (res && res.ok === 1 && res.value) {
                    resolve(ctor(res.value));
                } else if (error) { 
                    reject(Error(error.message));
                } else {
                    reject(Error(`nothing was updated in ${collection} by ${JSON.stringify(filter)}`));
                }
            }.bind(this);
    
            db.collection(this.envCollectionName(collection)).findOneAndUpdate(
                filter,
                setter,
                opt,
                callback);
    
        }.bind(this));
    }

    public insertOne<T extends IDbEntity>(collection: string, entity: IDbEntity, ctor: (obj: any) => T): Promise<T> {
        return new Promise<T>(async function(resolve, reject) {
            try {
                await this.ensureClientConnection();
            } catch (err) {
                reject(err);
                return;
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            let opt: CollectionInsertOneOptions = { w: "majority", j: true };
            let callback: MongoCallback<InsertOneWriteOpResult> = function (error: MongoError, res: InsertOneWriteOpResult) {
                if (res && res.result.ok === 1 && res.insertedCount === 1) {
                    resolve(ctor(res.ops[0]));
                } else if (error) {
                    console.error(error);
                    reject(Error(error.message));
                } else {
                    reject(Error(`nothing was inserted into ${collection}, ${JSON.stringify(entity)}`));
                }
            }.bind(this);

            db.collection(this.envCollectionName(collection)).insertOne(
                entity.toJSON(), 
                opt,
                callback);

        }.bind(this));
    }

    public upsertOne(collection: string, entity: IDbEntity): Promise<boolean> {
        return new Promise<boolean>(async function(resolve, reject) {
            try {
                await this.ensureClientConnection();
            } catch (err) {
                reject(err);
                return;
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);

            let opt: UpdateOneOptions = { w: "majority", j: true, upsert: true };
            let callback: MongoCallback<UpdateWriteOpResult> = function (error: MongoError, res: UpdateWriteOpResult) {
                if (res && res.result.ok === 1 && (res.upsertedCount === 1 || res.modifiedCount === 1)) {
                    resolve(true);
                } else if (error) {
                    console.error(error);
                    reject(Error(error.message));
                } else {
                    reject(Error(`nothing was upserted into ${collection}, ${JSON.stringify(entity)}`));
                }
            }.bind(this);

            db.collection(this.envCollectionName(collection)).updateOne(
                entity.filter,
                { $set: entity.toJSON() },
                opt, 
                callback);

        }.bind(this));
    }

    public updateOne(collection: string, filter: any, setter: any): Promise<boolean> {
        return new Promise<boolean>(async function(resolve, reject){
            try {
                await this.ensureClientConnection();
            } catch (err) {
                reject(err);
                return;
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            let opt: UpdateOneOptions = { upsert: false, w: "majority", j: true };
            let callback: MongoCallback<UpdateWriteOpResult> = function(error: MongoError, res: UpdateWriteOpResult) {
                if (res && res.result && res.result.ok === 1 && res.result.n > 0) {
                    resolve(true);
                } else if (error) {
                    console.error(error);
                    reject(Error(error.message));
                } else {
                    reject(Error(`nothing was updated in ${collection} by ${JSON.stringify(filter)}`));
                }
            }.bind(this);
    
            db.collection(this.envCollectionName(collection)).updateOne(
                filter,
                setter,
                opt, 
                callback);
    
        }.bind(this));
    }

    public async updateMany(collection: string, filter: any, setter: any): Promise<number> {
        return new Promise<number>(async function(resolve, reject){
            try {
                await this.ensureClientConnection();
            } catch (err) {
                reject(err);
                return;
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            let trans = uuidv4();
            setter.$set._trans = trans; //remember transaction

            let ops: UpdateManyOptions = { w: "majority", j: true, upsert: false };
            let callback: MongoCallback<UpdateWriteOpResult> = function(error:MongoError, res:UpdateWriteOpResult) {
                if (res && res.modifiedCount > 0) {
                    resolve(res.modifiedCount);
                } else if (error) {
                    console.error(error);
                    reject(Error(error.message));
                } else {
                    reject(Error(`failed to modify multiple entities in ${collection} by ${JSON.stringify(filter)}`));
                }
            }.bind(this);
    
            db.collection(this.envCollectionName(collection)).updateMany(
                filter, 
                setter, 
                ops, 
                callback);
    
        }.bind(this));
    }

    public async findManyAndUpdate<T extends IDbEntity>(collection: string, filter: any, setter: any, ctor: (obj: any) => T): Promise<T[]> {
        return new Promise<T[]>(async function(resolve, reject){
            try {
                await this.ensureClientConnection();
            } catch (err) {
                reject(err);
                return;
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            let trans = uuidv4();
            setter.$set._trans = trans; //remember transaction
    
            let ops: UpdateManyOptions = { w: "majority", j: true, upsert: false };
            let callback: MongoCallback<UpdateWriteOpResult> = async function(error:MongoError, res:UpdateWriteOpResult) {
                if (res && res.matchedCount === 0) {
                    resolve([]);
                } else if (res && res.matchedCount > 0 && res.modifiedCount > 0) {
                    // query updated documents with given transaction
                    let findResult = await db.collection(this.envCollectionName(collection)).find({ _trans: trans }).toArray();
                    resolve( findResult.map(e => ctor(e)) );
                } else if (error) {
                    console.error(error);
                    reject(Error(error.message));
                } else {
                    reject(Error(`failed to modify multiple entities in ${collection} by ${JSON.stringify(filter)}`));
                }
            }.bind(this);
    
            db.collection(this.envCollectionName(collection)).updateMany(
                filter, 
                setter, 
                ops, 
                callback);
    
        }.bind(this));
    }

    public async findOneAndDelete<T extends IDbEntity>(collection: string, filter: any, ctor: (obj: any) => T): Promise<T> {
        return new Promise<T>(async function(resolve, reject){
            try {
                await this.ensureClientConnection();
            } catch (err) {
                reject(err);
                return;
            }

            let db = this._client.db(this._settings.current.databaseName);
            assert.notEqual(db, null);
    
            let callback: MongoCallback<FindAndModifyWriteOpResultObject> = function (error: MongoError, res: FindAndModifyWriteOpResultObject) {
                if (res && res.ok === 1 && res.value) {
                    resolve(ctor(res.value));
                } else if (error) { 
                    reject(Error(error.message));
                } else {
                    reject(Error(`nothing was deleted from ${collection} by ${JSON.stringify(filter)}`));
                }
            }.bind(this);

            db.collection(this.envCollectionName(collection)).findOneAndDelete(
                filter,
                callback);

        }.bind(this));
    }

    public async ensureClientConnection() {
        if (!this._client || !this._client.isConnected) {
            try {
                await this.connect();
            } catch (err) {
                throw Error("failed to reconnect to database");
            }
        }
    }

    public envCollectionName(name: string) {
        return `${this._settings.current.collectionPrefix}-${name}`;
    }
    //#endregion

    private async safe<T>(promise: Promise<T>): Promise<T> {
        try {
            let res:T = await promise;
            return res;
        } catch {
            return undefined;
        }
    }
}
