"use strict";

import "reflect-metadata";

import { MongoClient } from "mongodb";
import { injectable, inject } from "inversify";
import { IDatabase, ISettings } from "../interfaces"

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

    public async createCollections(): Promise<any> {
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
    public async getSession(sessionGuid: string): Promise<Session> {
        let session = await this.findOneAndUpdate<Session>(
            "sessions", 
            { guid: sessionGuid, closed: { $ne: true } },
            { $set: { lastSeen: new Date() } },
            (obj) => new Session(obj));

        session.workerRef = await this.getOne<Worker>(
            "workers", 
            { 
                guid: session.workerGuid 
            }, 
            obj => new Worker(obj));

        return session;
    }

    public async createSession(apiKey: string, workspaceGuid: string): Promise<Session> {
        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let workspace = await this.getWorkspace(workspaceGuid);

        // pick only the workers who were seen not less than 2 seconds ago
        let workers = await this.getAvailableWorkers();
        console.log(" >> createSession, getAvailableWorkers returned: ", workers.length);

        // this will prevent multiple worker assignment, if top most worker was set busy = true,
        // then we just pick underlying least loaded worker.
        for(let wi in workers) {
            let candidate = workers[wi];
            console.log(`    candidate ${wi}: ${candidate.guid}`);
            let createdSession = await this.tryCreateSessionAtWorker(apiKey, workspace, candidate);
            if (createdSession) {
                console.log(`    OK! ${wi}: ${candidate.guid}, assigned session: ${createdSession.guid}`);
                return createdSession;
            } else {
                console.log(`  MISS! ${wi}: ${candidate.guid}, worker was busy`);
            }
        }

        throw Error("all workers busy");
    }

    private async tryCreateSessionAtWorker(apiKey: string, workspace: Workspace, candidate: Worker): Promise<Session> {
        try {
            console.log(" >> tryCreateSessionAtWorker: ", candidate.guid);

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

            let workersBefore = await this.getAvailableWorkers();
            console.log(" >> this.getAvailableWorkers BEFORE: ", workersBefore.length, " << end of available workers");

            let caputuredWorker = await this.findOneAndUpdate<Worker>("workers", filter, setter, (obj: any) => new Worker(obj));
            console.log(" >> caputuredWorker: ", caputuredWorker.guid, "\r\n\r\n");

            let workersAfter = await this.getAvailableWorkers();
            console.log(" >> this.getAvailableWorkers AFTER: ", workersAfter.length, " << end of available workers");

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

    public async closeSession(sessionGuid: string): Promise<Session> {
        let closedSession = await this.safe(this.findOneAndUpdate<Session>(
                "sessions",
                {
                    guid: sessionGuid,
                    closedAt: null
                },
                {
                    $set: {
                        closed: true, 
                        closedAt: new Date()
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
    public async getRecentWorkers(): Promise<Worker[]> {
        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let result = await db.collection(this.envCollectionName("workers")).find({ 
            workgroup: { $eq: this._settings.current.workgroup }
        }).sort({
            cpuUsage: 1 //sort by cpu load, less loaded first
        }).toArray();

        return result.map(e => new Worker(e));
    }

    public async getAvailableWorkers(): Promise<Worker[]> {
        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let recentOnlineDate = new Date(Date.now() - 2 * 1000);
        let result = await db.collection(this.envCollectionName("workers")).find({ 
            workgroup: { $eq: this._settings.current.workgroup },
            lastSeen : { $gte: recentOnlineDate },
            sessionGuid: { $eq: null }
        }).sort({
            cpuUsage: 1 //sort by cpu load, less loaded first
        }).toArray();

        console.log(result, "\r\n");

        return result.map(e => new Worker(e));
    }

    public storeWorker(worker: Worker): Promise<boolean> {
        return this.updateOne<Worker>("workers", worker, true);
    }

    public updateWorker(worker: Worker): Promise<Worker> {
        return this.findOneAndUpdate<Worker>("workers", worker.filter, worker.toJSON(), obj => new Worker(obj));
    }

    public async deleteDeadWorkers(): Promise<number> {
        let expirationDate = new Date(Date.now() - 30*1000); // delete workers that are more than 30 seconds offline

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

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

        return ctor(obj);
    }

    public async findOneAndUpdate<T extends IDbEntity>(collection: string, filter: any, setter: any, ctor: (obj: any) => T): Promise<T> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let obj = await db.collection(this.envCollectionName(collection)).findOneAndUpdate(
            filter,
            setter,
            { returnOriginal: false });

        if (obj.ok === 1 && obj.value) {
            return ctor(obj.value);
        } else {
            throw Error(`nothing was filtered from ${collection} by ${JSON.stringify(filter)}`);
        }
    }

    public async insertOne<T extends IDbEntity>(collection: string, entity: IDbEntity, ctor: (obj: any) => T): Promise<T> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let obj = await db.collection(this.envCollectionName(collection)).insertOne(entity.toJSON());

        if (obj.result.ok === 1 && obj.insertedCount === 1) {
            return ctor(obj.ops[0]);
        } else {
            throw Error(`failed to insert in ${collection}`);
        }
    }

    public async updateOne<T extends IDbEntity>(collection: string, entity: T, upsert: boolean): Promise<boolean> {
        await this.ensureClientConnection();

        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let obj = await db.collection(this.envCollectionName(collection)).updateOne(
            entity.filter,
            { $set: entity.toJSON() },
            { upsert: upsert });

        // result: { ok: 1, nModified: 0, n: 1, upserted: [ [Object] ] },
        if (obj && obj.result && obj.result.ok === 1 && obj.result.n > 0) {
            return true;
        } else {
            return false;
        }
    }

    public async updateMany(collection: string, filter: any, setter: any): Promise<number> {
        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let trans = uuidv4();
        setter.$set._trans = trans; //remember transaction

        let updateResult = await db.collection(this.envCollectionName(collection)).updateMany(filter, setter);
        return updateResult.modifiedCount;
    }

    public async findManyAndUpdate<T extends IDbEntity>(collection: string, filter: any, setter: any, ctor: (obj: any) => T): Promise<T[]> {
        let db = this._client.db(this._settings.current.databaseName);
        assert.notEqual(db, null);

        let trans = uuidv4();
        setter.$set._trans = trans; //remember transaction

        let updateResult = await db.collection(this.envCollectionName(collection)).updateMany(filter, setter);

        if (updateResult.matchedCount > 0 && updateResult.modifiedCount > 0) {
            // query updated documents with given transaction
            let findResult = await db.collection(this.envCollectionName(collection)).find({ _trans: trans }).toArray();
            return findResult.map(e => ctor(e));
        } else {
            return [];
        }
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

    private async safe<T>(promise: Promise<T>): Promise<T> {
        try {
            let res:T = await promise;
            return res;
        } catch {
            return undefined;
        }
    }
}
