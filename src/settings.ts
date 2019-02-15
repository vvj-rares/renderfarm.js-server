import "reflect-metadata";

import { injectable } from "inversify";
import { ISettings } from "./interfaces";

export interface SettingsData {
    workgroup: string;
    host: string;
    port: number;
    publicUrl: string;
    workerManagerPort: number;
    heartbeatPort: number;
    protocol: "http" | "https";
    sslKey: string;
    sslCert: string;
    renderOutputDir: string;
    apiKeyCheck: boolean;
    workspaceCheck: boolean;
    expireSessions: boolean;
    sessionTimeoutMinutes: number;
    workerTimeoutSeconds: number;
}

@injectable()
export class Settings implements ISettings {
    private _env: string;
    private _settings: SettingsData;
    private _majorVersion: number;
    private _version: string;

    constructor(env: string) {
        this._env = env;

        let settings = require("./settings/app.settings.js")();
        this._settings = settings.common;

        //now merge environment specific settings into common settings
        for (let p in settings[env]) {
            this._settings[p] = settings[env][p];
        }

        //now evaluate command line parameters and override settings
        for (let argi in process.argv) {
            let arg = process.argv[argi];
            let parts = arg.split("=");
            if (parts && parts.length !== 2) {
                continue;
            }

            let key: string = parts[0];
            let value: string = parts[1];

            if (key === "env") continue; // special case, env is processed before this was constructed
            if (this._settings[key] !== undefined) {
                this._settings[key] = value;
                console.log(`    OK | settings override: ${key} = ${value}`);
            }
        }

        let parts = settings.version.split(".");
        this._version = settings.version;
        this._majorVersion = parts[0];
    }

    public get env(): string {
        return this._env;
    }

    public get version(): string {
        return this._version;
    }

    public get majorVersion(): number {
        return this._majorVersion;
    }

    public get current(): any {
        return this._settings;
    }
}