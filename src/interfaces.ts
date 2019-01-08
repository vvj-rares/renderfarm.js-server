"use strict";

import * as express from "express";
import { WorkerInfo } from "./model/worker_info";
import { SessionInfo } from "./model/session_info";
import { WorkspaceInfo } from "./model/workspace_info";
import { JobInfo } from "./model/job_info";
import { VraySpawnerInfo } from "./model/vray_spawner_info";
import { ApiKey } from "./database/model/api_key";
import { Workspace } from "./database/model/workspace";
import { Session } from "./database/model/session";
import { IDbEntity } from "./database/model/base/IDbEntity";

export interface IDatabase {
    connect(): Promise<any>;
    disconnect(): Promise<any>;

    create(): Promise<any>;

    getApiKey(apiKey: string): Promise<ApiKey>;

    getWorkspace(workspaceGuid: string): Promise<Workspace>;
    getSession(sessionGuid: string): Promise<Session>;

    storeWorker(workerInfo: WorkerInfo): Promise<WorkerInfo>;
    getWorker(sessionGuid: string): Promise<WorkerInfo>;
    deleteDeadWorkers(): Promise<number>;

    storeVraySpawner(vraySpawnerInfo: VraySpawnerInfo): Promise<VraySpawnerInfo>;

    createSession(apiKey: string, workspace: string): Promise<Session>;
    assignSessionWorkspace(sessionGuid: string, workspaceGuid: string): Promise<boolean>;
    getSessionWorkspace(sessionGuid: string): Promise<WorkspaceInfo>;
    expireSessions(olderThanMinutes: number): Promise<Session[]>;
    closeSession(sessionGuid: string): Promise<boolean>;

    storeJob(jobInfo: JobInfo): Promise<JobInfo>;
    getJob(jobGuid: string): Promise<JobInfo>;
    getSessionActiveJobs(sessionGuid: string): Promise<JobInfo[]>;
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
    Listen(workerCb: (worker: WorkerInfo) => void, spawnerCb: (spawner: VraySpawnerInfo) => void): void;
}
