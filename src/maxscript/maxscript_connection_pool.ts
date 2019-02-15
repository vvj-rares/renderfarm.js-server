import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IMaxscriptConnectionPool, IFactory, IMaxscriptClient, ISessionService } from "../interfaces";

import { Session } from "../database/model/session";
import { SessionPoolBase } from "../core/session_pool_base";

@injectable()
export class MaxScriptConnectionPool extends SessionPoolBase<IMaxscriptClient> implements IMaxscriptConnectionPool {
    private _maxscriptClientFactory: IFactory<IMaxscriptClient>;

    constructor(
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IMaxscriptClientFactory) maxscriptClientFactory: IFactory<IMaxscriptClient>,
    ) {
        super(sessionService);

        this._maxscriptClientFactory = maxscriptClientFactory;

        this.id = Math.random();
        console.log(" >> MaxScriptConnectionPool: ", this.id);
    }

    public id: number;

    public Connect(session: Session): Promise<IMaxscriptClient> {
        return super._create(session, this._maxscriptClientFactory.create.bind(this._maxscriptClientFactory));
    }

    protected async onBeforeItemAdd(session: Session, maxscript: IMaxscriptClient): Promise<boolean> {
        // try to connect to worker remote maxscript endpoint
        try {
            await maxscript.connect(session.workerRef.ip, session.workerRef.port);
            console.log(`    OK | SessionEndpoint connected to maxscript client`);
        } catch (err) {
            console.log(`  FAIL | failed to connect to worker, `, err);
            throw new Error("failed to connect to worker");
        }

        // try to set maxscript SessionGuid global variable
        try {
            await maxscript.setSession(session.guid);
            console.log(`    OK | SessionGuid on worker was updated`);
        } catch (err) {
            maxscript.disconnect();
            console.log(`  FAIL | failed to update SessionGuid on worker, `, err);
            throw new Error("failed to update SessionGuid on worker");
        }

        // try to configure 3ds max folders from workspace
        try {
            await maxscript.setWorkspace(session.workspaceRef);
            console.log(`    OK | workspace ${session.workspaceGuid} assigned to session ${session.guid}`);
        } catch (err) {
            console.log(`  FAIL | failed to set workspace on worker, `, err);
            maxscript.disconnect();
            throw new Error("failed to set workspace on worker");
        }

        //try to open scene if defined
        if (session.sceneFilename) {
            try {
                await maxscript.openScene("root", session.sceneFilename, session.workspaceRef);
                console.log(`    OK | scene open: ${session.sceneFilename}`);
            } catch (err) {
                maxscript.disconnect();
                console.log(`  FAIL | failed to open scene, `, err);
                throw new Error("failed to open scene");
            }
        }

        // all went fine, let base class add maxscript client to inner cache
        return true;
    }

    protected async onBeforeItemRemove(closedSession: Session, maxscript: IMaxscriptClient): Promise<any> {
        try {
            maxscript.disconnect();
        } catch (err) {
            console.log(`  WARN | client.disconnect threw exception, `, err);
        }
    }
}
