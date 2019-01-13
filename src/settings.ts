import "reflect-metadata";

import { injectable } from "inversify";
import { ISettings } from "./interfaces";

@injectable()
export class Settings implements ISettings {
    private _env: string;
    private _settings: any;
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