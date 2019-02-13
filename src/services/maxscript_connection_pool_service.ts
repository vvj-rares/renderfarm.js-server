import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, IMaxScriptConnectionPoolService } from "../interfaces";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";

@injectable()
export class MaxScriptConnectionPoolService extends EventEmitter implements IMaxScriptConnectionPoolService {
    private _settings: ISettings;
    private _database: IDatabase;

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
    ) {
        super();

        this._settings = settings;
        this._database = database;

        this.id = Math.random();
        console.log(" >> MaxScriptConnectionPoolService: ", this.id);

        // this._workerService.on("worker:offline", this.onWorkerOffline.bind(this));

        // console.log(`expireSessions (in minutes): ${this._settings.current.expireSessions}`);
        // must be KeepAlive timer, => this.StartSessionWatchdogTimer(this._settings.current.sessionTimeoutMinutes);
    }

    public id: number;

    // todo: collect open maxscript sessions and keep them alive until session is open.
    // also care to reopen connections in case of network interruption
}
