import "reflect-metadata";

import { injectable } from "inversify";
import { ISettings } from "./interfaces";

@injectable()
export class Settings implements ISettings {
    private _settings: any;
    private _majorVersion: number;
    private _version: string;

    constructor(private _env: string) {

        let settings = require("./settings/app.settings.js")();
        this._settings = settings.common;

        //now merge environment specific settings into common settings
        for (let p in settings[this._env]) {
            this._settings[p] = settings[this._env][p];
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