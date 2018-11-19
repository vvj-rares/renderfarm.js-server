"use strict";

import * as express from "express";
import { Project } from "./model/project";

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
    getProjects(apiKey: string): Promise<Project[]>;
    getProject(apiKey: string, projectGuid: string): Promise<Project>;
    updateProject(apiKey: string, project: Project): Promise<Project>;
    deleteProject(apiKey: string, projectGuid: string): Promise<any>;
}

export interface IApp {
    express: express.Application;
}

export interface IEndpoint {
    bind(express: express.Application);
}

export interface IChecks {
    checkApiKey(res: any, database: IDatabase, apiKey: string): Promise<boolean>;
}

export interface IMaxscriptClient {
    connect(ip: string): Promise<boolean>;
    resetScene(): Promise<boolean>;
}