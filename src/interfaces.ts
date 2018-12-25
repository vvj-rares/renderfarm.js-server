"use strict";

import * as express from "express";
import { WorkerInfo } from "./model/worker_info";
import { SessionInfo } from "./model/session_info";
import { WorkspaceInfo } from "./model/workspace_info";
import { JobInfo } from "./model/job_info";
import { VraySpawnerInfo } from "./model/vray_spawner_info";

export interface Warrior {
    fight(): string;
    sneak(): string;
}

export interface Weapon {
    hit(): string;
}

export interface ThrowableWeapon {
    throw(): string;
}

export interface IDatabase {
    connect(url: string): Promise<any>;
    getApiKey(apiKey: string): Promise<any>;

    getWorkspace(workspaceGuid: string): Promise<any>; // todo: return WorkspaceInfo
    getSession(sessionGuid: string): Promise<SessionInfo>;

    storeWorker(workerInfo: WorkerInfo): Promise<WorkerInfo>;
    getWorker(sessionGuid: string): Promise<WorkerInfo>;
    deleteDeadWorkers(): Promise<number>;

    storeVraySpawner(vraySpawnerInfo: VraySpawnerInfo): Promise<VraySpawnerInfo>;

    startWorkerSession(apiKey: string, sessionGuid: string): Promise<WorkerInfo>;
    assignSessionWorkspace(sessionGuid: string, workspaceGuid: string): Promise<boolean>;
    getSessionWorkspace(sessionGuid: string): Promise<WorkspaceInfo>;
    expireSessions(): Promise<SessionInfo[]>;
    closeSession(sessionGuid: string): Promise<boolean>;

    storeJob(jobInfo: JobInfo): Promise<JobInfo>;
    getJob(jobGuid: string): Promise<JobInfo>;
    getSessionActiveJobs(sessionGuid: string): Promise<JobInfo[]>;
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