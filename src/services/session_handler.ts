import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, ISessionHandler, ISessionObserver } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class SessionHandler implements ISessionHandler, ISessionObserver {
    private _settings: ISettings;
    private _database: IDatabase;

    private _sessionOpenCb:   ((session: Session) => Promise<any>) [] = []; // array of callbacks
    private _sessionUpdateCb: ((session: Session) => Promise<any>) [] = [];
    private _sessionCloseCb:  ((session: Session) => Promise<any>) [] = [];
    private _sessionFailCb:   ((session: Session) => Promise<any>) [] = [];

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
    ) {
        this._settings = settings;
        this._database = database;

        this.id = Math.random();
        console.log(" >> SessionHandler: ", this.id);
    }

    public id: number;

    public async Open(): Promise<Session> {
        throw new Error("Method not implemented.");
    }

    public async KeepAlive(sessionGuid: string): Promise<Session> {
        throw new Error("Method not implemented.");
    }

    public async Close(sessionGuid: string): Promise<Session> {
        throw new Error("Method not implemented.");
    }

    public async Expire(sessionGuid: string): Promise<Session> {
        throw new Error("Method not implemented.");
    }

    public async Fail(sessionGuid: string): Promise<Session> {
        throw new Error("Method not implemented.");
    }

    public Subscribe(sessionOpenCb:  (session: Session) => Promise<any>): void {
        if (sessionOpenCb) {
            this._sessionOpenCb.push(sessionOpenCb);
        }
    }
}