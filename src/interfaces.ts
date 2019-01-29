"use strict";

import * as express from "express";
import { VraySpawnerInfo } from "./model/vray_spawner_info";
import { ApiKey } from "./database/model/api_key";
import { Workspace } from "./database/model/workspace";
import { Session } from "./database/model/session";
import { Worker } from "./database/model/worker";

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

    getSession(sessionGuid: string, options?: any): Promise<Session>;
    createSession(apiKey: string, workspace: string): Promise<Session>;
    expireSessions(olderThanMinutes: number): Promise<Session[]>;
    closeSession(sessionGuid: string): Promise<Session>;
    failSession(sessionGuid: string, failReason?: string | undefined): Promise<Session>;

    //workspaces
    getWorkspace(workspaceGuid: string): Promise<Workspace>;

    insertWorker(worker: Worker): Promise<Worker>;
    upsertWorker(worker: Worker): Promise<boolean>;
    updateWorker(worker: Worker, setter: any): Promise<Worker>;
    deleteWorker(worker: Worker): Promise<Worker>;

    //workers
    getWorker(workerGuid: string): Promise<Worker>;
    getRecentWorkers(): Promise<Worker[]>;
    getAvailableWorkers(): Promise<Worker[]>;
    deleteDeadWorkers(): Promise<number>;

    //storeVraySpawner(vraySpawnerInfo: VraySpawnerInfo): Promise<VraySpawnerInfo>;

    //storeJob(jobInfo: JobInfo): Promise<JobInfo>;
    //getJob(jobGuid: string): Promise<JobInfo>;
    //getSessionActiveJobs(sessionGuid: string): Promise<JobInfo[]>;
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

export interface IMaxscriptClientFactory {
    create(): IMaxscriptClient;
}

export interface IWorkerHeartbeatListener {
    Listen(): void;
}

export interface IWorkerObserver {
    Subscribe(
        workerAddedCb:   (worker: Worker) => Promise<any>,   // received first heartbeat, worker just started
        workerUpdatedCb: (worker: Worker) => Promise<any>,   // received next heartbeat, worker was actualized
        workerOfflineCb: (worker: Worker) => Promise<any>,   // called when worker stops sending heartbeats
        spawnerCb:      (spawner: VraySpawnerInfo) => Promise<any>): void;
}