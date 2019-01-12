"use strict";

import * as express from "express";
import { WorkspaceInfo } from "./model/workspace_info";
import { VraySpawnerInfo } from "./model/vray_spawner_info";
import { ApiKey } from "./database/model/api_key";
import { Workspace } from "./database/model/workspace";
import { Session } from "./database/model/session";
import { Worker } from "./database/model/worker";

export interface IDatabase {
    connect(): Promise<any>;
    disconnect(): Promise<any>;

    createCollections(): Promise<any>;
    dropCollections(): Promise<any>;

    //api keys
    getApiKey(apiKey: string): Promise<ApiKey>;

    getSession(sessionGuid: string): Promise<Session>;
    createSession(apiKey: string, workspace: string): Promise<Session>;
    expireSessions(olderThanMinutes: number): Promise<Session[]>;
    closeSession(sessionGuid: string): Promise<Session>;

    //workspaces
    getWorkspace(workspaceGuid: string): Promise<Workspace>;

    storeWorker(worker: Worker): Promise<boolean>;
    updateWorker(worker: Worker): Promise<Worker>;

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
    disconnect();

    execMaxscript(maxscript: string, actionDesc: string): Promise<boolean>;

    resetScene(sceneName): Promise<boolean>;
    createScene(sceneName): Promise<boolean>;
    openScene(sceneName: string, maxSceneFilename: string, workspace: WorkspaceInfo);

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
    Listen(workerCb: (worker: Worker) => void, spawnerCb: (spawner: VraySpawnerInfo) => void): void;
}
