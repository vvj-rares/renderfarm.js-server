"use strict";

import * as express from "express";
import { ApiKey } from "./database/model/api_key";
import { Workspace } from "./database/model/workspace";
import { Session } from "./database/model/session";
import { Worker } from "./database/model/worker";
import { Job } from "./database/model/job";

export interface IGetSessionOptions {
    allowClosed: boolean;
    readOnly: boolean;
}

export interface IDatabase {
    connect(): Promise<any>;
    disconnect(): Promise<any>;

    createCollections(): Promise<any>;
    dropCollections(): Promise<any>;

    //api keys
    getApiKey(apiKey: string): Promise<ApiKey>;

    //sessions
    getSession(sessionGuid: string, options?: any): Promise<Session>;
    createSession(apiKey: string, workspace: string, sceneFilename?: string): Promise<Session>;
    expireSessions(olderThanMinutes: number): Promise<Session[]>;
    closeSession(sessionGuid: string): Promise<Session>;
    failSession(sessionGuid: string, failReason?: string | undefined): Promise<Session>;

    //workspaces
    getWorkspace(workspaceGuid: string): Promise<Workspace>;

    //workers
    getWorker(workerGuid: string): Promise<Worker>;
    insertWorker(worker: Worker): Promise<Worker>;
    upsertWorker(worker: Worker): Promise<boolean>;
    updateWorker(worker: Worker, setter: any): Promise<Worker>;
    getRecentWorkers(): Promise<Worker[]>;
    getAvailableWorkers(): Promise<Worker[]>;

    //storeVraySpawner(vraySpawnerInfo: VraySpawnerInfo): Promise<VraySpawnerInfo>;

    //jobs
    getJob(jobGuid: string): Promise<Job>;
    getActiveJobs(workgroup: string): Promise<Job[]>;
    createJob(apiKey: string, workerGuid: string): Promise<Job>;
    updateJob(job: Job, setter: any): Promise<Job>;
    completeJob(job: Job, urls: string[]): Promise<Job>;
    cancelJob(job: Job): Promise<Job>;
    failJob(job: Job, error: string): Promise<Job>;
}

export interface ISettings {
    version: string;
    majorVersion: number;
    current: any;
    env: string;
}

export interface IApp {
    express: express.Application;
}

export interface IEndpoint {
    bind(express: express.Application);
}

export interface IMaxscriptClient {
    connect(ip: string, port: number): Promise<boolean>;
    disconnect(): void;

    execMaxscript(maxscript: string, actionDesc: string): Promise<boolean>;

    resetScene(): Promise<boolean>;
    createScene(sceneRootNodeName): Promise<boolean>;
    openScene(sceneRootNodeName: string, maxSceneFilename: string, workspace: Workspace);

    setObjectWorldMatrix(nodeName, matrixWorldArray): Promise<boolean>;
    linkToParent(nodeName: string, parentName: string): Promise<boolean>;
    renameObject(nodeName: string, newName: string): Promise<boolean>;

    setSession(sessionGuid: string): Promise<boolean>;
    setWorkspace(workspaceInfo: any): Promise<boolean>;

    createTargetCamera(cameraJson): Promise<boolean>;
    updateTargetCamera(cameraJson: any): Promise<boolean>;
    deleteObjects(mask: string): Promise<boolean>;
    cloneInstance(nodeName: string, cloneName: string): Promise<boolean>;

    createSpotlight(spotlightJson: any): Promise<boolean>;
    createMaterial(materialJson: any): Promise<boolean>;

    downloadJson(url: string, path: string): Promise<boolean>;
    importMesh(path: string, nodeName: string): Promise<boolean>;

    assignMaterial(nodeName: string, materialName: string): Promise<boolean>;

    renderScene(camera: string, size: number[], filename: string, vraySettings: any): Promise<boolean>;
}

export interface IFactory<T> {
    create(sessionGuid: string): T;
}

export interface ISessionPool<T> {
    Get(sessionGuid: string): T;
}

export interface IWorkerService {
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export interface IJobService {
    Start(sessionGuid: string, job: Job): void;
    Cancel(job: Job): void;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export interface ISessionService {
    GetSession(sessionGuid: string, allowClosed?: boolean, letTouch?: boolean): Promise<Session>;
    CreateSession(apiKey: string, workspaceGuid: string, sceneFilename?: string): Promise<Session>;
    KeepSessionAlive(sessionGuid: string): Promise<Session>;
    CloseSession(sessionGuid: string): Promise<Session>;
    ExpireSessions(sessionTimeoutMinutes: number): Promise<Session[]>;
    FailSession(sessionGuid: string, failReason?: string): Promise<Session>;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export enum SessionServiceEvents {
    Created = "session:created",
    Ready = "session:ready",
    Updated = "session:updated",
    Closed = "session:closed",
    Expired = "session:expired",
    Failed = "session:failed",
    WatchdogStarted = "session-watchdog:started",
}

export interface IThreeConverter {
    PostScene(sceneJson: any): Promise<any>;
}
