import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { SessionPoolBase } from "../core/session_pool_base";
import { ISessionService, IFactory, IThreeConverter, IThreeConverterPool } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class ThreeConverterPool extends SessionPoolBase<IThreeConverter> implements IThreeConverterPool {
    private _maxscriptThreeConnectorFactory: IFactory<IThreeConverter>;

    constructor (
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IMaxscriptThreeConnectorFactory) maxscriptThreeConnectorFactory: IFactory<IThreeConverter>,
    ) {
        super(sessionService);

        this._maxscriptThreeConnectorFactory = maxscriptThreeConnectorFactory;
    }

    public async Create(session: Session): Promise<IThreeConverter> {
        return super._create(session, this._maxscriptThreeConnectorFactory.create.bind(this._maxscriptThreeConnectorFactory));
    }

    protected async onBeforeItemAdd(session: Session, connector: IThreeConverter): Promise<boolean> {
        return true;
    }    
    
    protected async onBeforeItemRemove(closedSession: Session, item: IThreeConverter): Promise<any> {
        return;
    }
}