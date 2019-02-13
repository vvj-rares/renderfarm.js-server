import { injectable, inject, decorate } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, ISessionService } from "../interfaces";
import { Session } from "../database/model/session";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";

@injectable()
export class SessionService extends EventEmitter implements ISessionService {
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
        console.log(" >> SessionService: ", this.id);

        if (this._settings.current.expireSessions) {
            console.log(`expireSessions (in minutes): ${this._settings.current.expireSessions}`);
            this.StartSessionWatchdogTimer(this._settings.current.sessionTimeoutMinutes);
        } else {
            console.log(`expireSessions is ${this._settings.current.expireSessions}, this instance will not expire abandoned sessions`);
        }

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

    public async CreateSession(apiKey: string, workspaceGuid: string, sceneFilename?: string): Promise<Session> {
        let createdSession = await this._database.createSession(
            apiKey,
            workspaceGuid,
            sceneFilename,
        );
        this.emit("session:created", createdSession);
        return createdSession;
    }

    public async KeepSessionAlive(sessionGuid: string): Promise<Session> {
        let updatedSession = await this._database.getSession(
            sessionGuid,
            {
                allowClosed: false,
                readOnly: false,
            },
        );
        this.emit("session:updated", updatedSession);
        return updatedSession;
    }

    public async CloseSession(sessionGuid: string): Promise<Session> {
        let closedSession = await this._database.closeSession(sessionGuid);
        this.emit("session:closed", closedSession);
        return closedSession;
    }

    public async ExpireSessions(sessionTimeoutMinutes: number): Promise<Session[]> {
        let expiredSessions = await this._database.expireSessions(sessionTimeoutMinutes);
        for (let s in expiredSessions) {
            this.emit("session:expired", expiredSessions[s]);
        }
        return expiredSessions;
    }

    public async FailSession(sessionGuid: string, failReason?: string): Promise<Session> {
        let failedSession = await this._database.failSession(
            sessionGuid,
            failReason,
        );
        this.emit("session:failed", failedSession);
        return failedSession;
    }

    private StartSessionWatchdogTimer(sessionTimeoutMinutes: number) {
        //expire sessions by timer
        setInterval(async function() {
            try {
                let expiredSession = await this.ExpireSessions(sessionTimeoutMinutes);
                if (expiredSession.length === 0) {
                    return;
                }
                console.log(`    OK | expired sessions: ${expiredSession.length}`);
            } catch (err) {
                console.error(err);
            }

        }.bind(this), 5000); // check old sessions each 5 seconds
        this.emit("session-watchdog:started");
    }
}