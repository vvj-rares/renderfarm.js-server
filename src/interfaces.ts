"use strict";

import * as express from "express";
import { WorkerInfo } from "./model/worker_info";
import { SessionInfo } from "./model/session_info";

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

    getWorkspace(apiKey: string, workspaceGuid: string): Promise<any>;

    storeWorker(workerInfo: WorkerInfo): Promise<WorkerInfo>;
    startWorkerSession(apiKey: string, sessionGuid: string): Promise<WorkerInfo>;
    getWorker(sessionGuid: string): Promise<WorkerInfo>;

    startWorkerSession(apiKey: string, sessionGuid: string): Promise<WorkerInfo>;
    expireSessions(): Promise<SessionInfo[]>;
    closeSession(sessionGuid: string): Promise<boolean>;
}

export interface IApp {
    express: express.Application;
}

export interface IEndpoint {
    bind(express: express.Application);
}

export interface IMaxscriptClient {
    connect(ip: string): Promise<boolean>;
    disconnect();

    resetScene(sceneName): Promise<boolean>;
    createScene(sceneName): Promise<boolean>;
    // todo: openScene(sceneFilename): Promise<boolean>;

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
    createSkylight(skylightJson: any): Promise<boolean>;
    createMaterial(materialJson: any): Promise<boolean>;

    downloadJson(url: string, path: string): Promise<boolean>;
    importMesh(path: string, nodeName: string): Promise<boolean>;

    assignMaterial(nodeName: string, materialName: string): Promise<boolean>;

    renderScene(camera: string, size: number[], filename: string): Promise<boolean>;

    uploadPng(path: string, url: string): Promise<boolean>;
}

export interface IMaxscriptClientFactory {
    create(): IMaxscriptClient;
}