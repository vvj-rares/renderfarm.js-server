import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { ISettings, IDatabase, IMaxscriptConnectionPool, IFactory, IMaxscriptClient, ISessionService, SessionServiceEvents } from "../interfaces";

///<reference path="./typings/node/node.d.ts" />
import { EventEmitter } from "events";
import { Session } from "../database/model/session";

@injectable()
export class MaxScriptConnectionPool extends EventEmitter implements IMaxscriptConnectionPool {
    private _settings: ISettings;
    private _database: IDatabase;
    private _sessionService: ISessionService;
    private _maxscriptClientFactory: IFactory<IMaxscriptClient>;

    // keep maxscript connections alive for open sessions
    private _maxscriptClients: { [sessionGuid: string] : IMaxscriptClient; } = {};

    constructor(
        @inject(TYPES.ISettings) settings: ISettings,
        @inject(TYPES.IDatabase) database: IDatabase,
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IFactory<IMaxscriptClient>,
    ) {
        super();

        this._settings = settings;
        this._database = database;
        this._sessionService = sessionService;
        this._maxscriptClientFactory = maxscriptClientFactory;

        this.id = Math.random();
        console.log(" >> MaxScriptConnectionPool: ", this.id);

        // this._workerService.on("worker:offline", this.onWorkerOffline.bind(this));

        // console.log(`expireSessions (in minutes): ${this._settings.current.expireSessions}`);
        // must be KeepAlive timer, => this.StartSessionWatchdogTimer(this._settings.current.sessionTimeoutMinutes);

        this._sessionService.on(SessionServiceEvents.Closed, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Expired, this.onSessionClosed.bind(this));
        this._sessionService.on(SessionServiceEvents.Failed, this.onSessionClosed.bind(this));
    }

    public id: number;

    // todo: collect open maxscript sessions and keep them alive until session is open.
    // also care to reopen connections in case of network interruption

    public async Create(session: Session): Promise<IMaxscriptClient> {
        // try connect to worker
        let client: IMaxscriptClient = this._maxscriptClientFactory.create();
        this._maxscriptClients[session.guid] = client;

        try {
            await client.connect(session.workerRef.ip, session.workerRef.port);
            console.log(`    OK | SessionEndpoint connected to maxscript client`);
        } catch (err) {
            console.log(`  FAIL | failed to connect to worker, `, err);
            throw new Error("failed to connect to worker");
        }

        // try to set maxscript SessionGuid global variable
        try {
            await client.setSession(session.guid);
            console.log(`    OK | SessionGuid on worker was updated`);
        } catch (err) {
            client.disconnect();
            delete this._maxscriptClients[session.guid];

            console.log(`  FAIL | failed to update SessionGuid on worker, `, err);
            throw new Error("failed to update SessionGuid on worker");
        }

        // try to configure 3ds max folders from workspace
        try {
            await client.setWorkspace(session.workspaceRef);
            console.log(`    OK | workspace ${session.workspaceGuid} assigned to session ${session.guid}`);
        } catch (err) {
            console.log(`  FAIL | failed to set workspace on worker, `, err);
            client.disconnect();
            delete this._maxscriptClients[session.guid];

            throw new Error("failed to set workspace on worker");
        }

        //try to open scene if defined
        if (session.sceneFilename) {
            try {
                await client.openScene("root", session.sceneFilename, session.workspaceRef);
                console.log(`    OK | scene open: ${session.sceneFilename}`);
            } catch (err) {
                client.disconnect();
                delete this._maxscriptClients[session.guid];

                console.log(`  FAIL | failed to open scene, `, err);
                throw new Error("failed to open scene");
            }
        }

        return client;
    }

    private async onSessionClosed(session: Session) {
        let maxscript = this._maxscriptClients[session.guid];
        if (!maxscript) {
            console.log(`  WARN | could not find maxscript client for session: ${session.guid}`);
            return;
        }

        try {
            maxscript.disconnect();
        } catch (err) {
            console.log(`  WARN | client.disconnect threw exception, `, err);
        }

        delete this._maxscriptClients[session.guid];

        // todo: also request Worker Manager to restart this worker
    }
}
