import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { SessionPoolBase } from "../core/session_pool_base";
import { ISessionService, IFactory, IThreeConverter, IThreeConverterPool } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class ThreeConverterPool extends SessionPoolBase<IThreeConverter> implements IThreeConverterPool {
    private _threeConverterFactory: IFactory<IThreeConverter>;

    constructor (
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IThreeConverterFactory) threeConverterFactory: IFactory<IThreeConverter>,
    ) {
        super(sessionService);

        this._threeConverterFactory = threeConverterFactory;
    }

    public async Create(session: Session): Promise<IThreeConverter> {
        return super._create(session, this._threeConverterFactory.create.bind(this._threeConverterFactory));
    }

    protected async onBeforeItemAdd(session: Session, connector: IThreeConverter): Promise<boolean> {
        return true;
    }    
    
    protected async onBeforeItemRemove(closedSession: Session, item: IThreeConverter): Promise<any> {
        return;
    }
}