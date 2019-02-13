import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, ISessionService, ISessionObserver } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class SessionService implements ISessionService, ISessionObserver {
    private _settings: ISettings;
    private _database: IDatabase;

    private _sessionCreatedCb:   ((session: Session) => Promise<any>) [] = []; // array of callbacks
    private _sessionUpdatedCb: ((session: Session) => Promise<any>) [] = [];
    private _sessionClosedCb:  ((session: Session) => Promise<any>) [] = [];
    private _sessionFailedCb:   ((session: Session) => Promise<any>) [] = [];
    private _sessionExpiredCb:   ((session: Session) => Promise<any>) [] = [];

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

    public GetSession(sessionGuid: string, allowClosed?: boolean, letTouch?: boolean): Promise<Session> {
        return this._database.getSession(
            sessionGuid,
            { 
                allowClosed: allowClosed, 
                readOnly: !letTouch,
            },
        );
    }

    public CreateSession(apiKey: string, workspaceGuid: string, sceneFilename?: string): Promise<Session> {
        return this._database.createSession(
            apiKey,
            workspaceGuid,
            sceneFilename,
        );
    }

    public KeepSessionAlive(sessionGuid: string): Promise<Session> {
        return this._database.getSession(
            sessionGuid,
            {
                allowClosed: false,
                readOnly: false,
            },
        );
    }

    public CloseSession(sessionGuid: string): Promise<Session> {
        return this._database.closeSession(sessionGuid);
    }

    public ExpireSessions(sessionTimeoutMinutes: number): Promise<Session[]> {
        return this._database.expireSessions(sessionTimeoutMinutes);
    }

    public FailSession(sessionGuid: string, failReason?: string): Promise<Session> {
        return this._database.failSession(
            sessionGuid,
            failReason,
        );
    }

    public Subscribe(sessionCreatedCb:  (session: Session) => Promise<any>): void {
        if (sessionCreatedCb) {
            this._sessionCreatedCb.push(sessionCreatedCb);
        }
    }
}