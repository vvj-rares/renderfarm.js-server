import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, ISessionService, IWorkerService, SessionServiceEvents } from "../interfaces";
import { Session } from "../database/model/session";
import { Worker } from "../database/model/worker";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";

@injectable()
export class SessionService extends EventEmitter implements ISessionService {
    private _settings: ISettings;
    private _database: IDatabase;
    private _workerService: IWorkerService;

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
        @inject(TYPES.IWorkerService) workerService: IWorkerService,
    ) {
        super();

        this._settings = settings;
        this._database = database;
        this._workerService = workerService;

        this.id = Math.random();
        console.log(" >> SessionService: ", this.id);

        this._workerService.on("worker:offline", this.onWorkerOffline.bind(this));

        if (this._settings.current.expireSessions) {
            console.log(`expireSessions (in minutes): ${this._settings.current.expireSessions}`);
            this.StartSessionWatchdogTimer(this._settings.current.sessionTimeoutMinutes);
        } else {
            console.log(`expireSessions is ${this._settings.current.expireSessions}, this instance will not expire abandoned sessions`);
        }
    }

    public id: number;

    public GetSession(sessionGuid: string, allowClosed?: boolean, letTouch?: boolean, resolveRefs?: boolean): Promise<Session> {
        return this._database.getSession(
            sessionGuid,
            { 
                allowClosed: allowClosed, 
                readOnly: !letTouch,
                resolveRefs: resolveRefs,
            },
        );
    }

    public async CreateSession(apiKey: string, workspaceGuid: string, sceneFilename?: string): Promise<Session> {
        let createdSession = await this._database.createSession(
            apiKey,
            workspaceGuid,
            sceneFilename,
        );
        this.emit(SessionServiceEvents.Created, createdSession);
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
        this.emit(SessionServiceEvents.Updated, updatedSession);
        return updatedSession;
    }

    public async CloseSession(sessionGuid: string): Promise<Session> {
        let closedSession = await this._database.closeSession(sessionGuid);
        this.emit(SessionServiceEvents.Closed, closedSession);
        return closedSession;
    }

    public async ExpireSessions(sessionTimeoutMinutes: number): Promise<Session[]> {
        let expiredSessions = await this._database.expireSessions(sessionTimeoutMinutes);
        for (let s in expiredSessions) {
            this.emit(SessionServiceEvents.Expired, expiredSessions[s]);
        }
        return expiredSessions;
    }

    public async FailSession(sessionGuid: string, failReason?: string): Promise<Session> {
        let failedSession = await this._database.failSession(
            sessionGuid,
            failReason,
        );
        this.emit(SessionServiceEvents.Failed, failedSession);
        return failedSession;
    }

    private StartSessionWatchdogTimer(sessionTimeoutMinutes: number) {
        //expire sessions by timer
        setInterval(async function(this: SessionService) {
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
        this.emit(SessionServiceEvents.WatchdogStarted);
    }

    private async onWorkerOffline(w: Worker) {
        console.log("Worker went offline: ", w);

        let worker: Worker;
        try {
            worker = await this._database.getWorker(w.guid);
        }
        catch (err) {
            console.log(`  FAIL | failed to close session ${w.sessionGuid} for dead worker: ${w.guid}: `, err);
            return;
        }

        if (worker.sessionGuid) {
            try {
                await this.FailSession(worker.sessionGuid, "worker failed");

                console.log(`    OK | closed session ${worker.sessionGuid} for dead worker: ${worker.guid}`);
            } catch (err) {
                console.log(`  FAIL | failed to close session ${worker.sessionGuid} for dead worker: ${worker.guid}: `, err);
            }
        }
    }
}