import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { SessionPoolBase } from "../core/session_pool_base";
import { IMaxscriptThreeConnector, IMaxscriptThreeConnectorPool, ISessionService, IFactory } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class MaxscriptThreeConnectorPool extends SessionPoolBase<IMaxscriptThreeConnector> implements IMaxscriptThreeConnectorPool {
    private _maxscriptThreeConnectorFactory: IFactory<IMaxscriptThreeConnector>;

    constructor (
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IMaxscriptThreeConnectorFactory) maxscriptThreeConnectorFactory: IFactory<IMaxscriptThreeConnector>,
    ) {
        super(sessionService);

        this._maxscriptThreeConnectorFactory = maxscriptThreeConnectorFactory;
    }

    public async Create(session: Session): Promise<IMaxscriptThreeConnector> {
        return super._create(session, this._maxscriptThreeConnectorFactory.create);
    }

    protected async onBeforeItemAdd(session: Session, connector: IMaxscriptThreeConnector): Promise<boolean> {
        return true;
    }    
    
    protected async onBeforeItemRemove(closedSession: Session, item: IMaxscriptThreeConnector): Promise<any> {
        return;
    }
}