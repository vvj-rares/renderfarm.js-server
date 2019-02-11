import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, ISessionWatchdog } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class SessionWatchdog implements ISessionWatchdog {
    private _settings: ISettings;
    private _database: IDatabase;

    private _sessionExpiredCb: ((session: Session) => Promise<any>) []      = []; // array of callbacks

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
    ) {
        this._settings = settings;
        this._database = database;

        this.id = Math.random();
        console.log(" >> SessionWatchdog: ", this.id);

        if (this._settings.current.expireSessions) {
            console.log(`expireSessions (in minutes): ${this._settings.current.expireSessions}`);
            this.startWatchdogTimer(this._settings.current.sessionTimeoutMinutes);
        } else {
            console.log(`expireSessions is ${this._settings.current.expireSessions}, this instance will not expire abandoned sessions`);
        }
    }

    public id: number;

    public Subscribe(sessionExpiredCb:  (session: Session) => Promise<any>): void {
        if (sessionExpiredCb) {
            this._sessionExpiredCb.push(sessionExpiredCb);
        }
    }

    private startWatchdogTimer(sessionTimeoutMinutes: number) {
        //expire sessions by timer
        setInterval(async function() {
            try {
                await this._database.expireSessions(sessionTimeoutMinutes)
                    .then(function(sessions) {
                        if (sessions.length === 0) {
                            return;
                        }

                        console.log(`    OK | expired sessions: ${sessions.length}`);

                        // notify subscribers
                        for (let c in this._sessionExpiredCb) {
                            for (let s in sessions) {
                                try {
                                    this._sessionExpiredCb[c](sessions[s]);
                                } catch (err) {
                                    console.log(`  WARN | _sessionExpiredCb threw exception: `, err);
                                    console.log(`       | session was: `, sessions[s]);
                                }
                            }
                        }

                    }.bind(this))
                    .catch(function(err) {
                        console.error(err);
                    }.bind(this));
            } catch (err) {
                console.error(err);
            }

        }.bind(this), 5000); // check old sessions each 5 seconds
    }
}