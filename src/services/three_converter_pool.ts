import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { SessionPoolBase } from "../core/session_pool_base";
import { ISessionService, IFactory, IThreeConverter } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class ThreeConverterPool extends SessionPoolBase<IThreeConverter> {
    constructor (
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IThreeConverterFactory) threeConverterFactory: IFactory<IThreeConverter>,
    ) {
        super(sessionService, threeConverterFactory.Create.bind(threeConverterFactory));
    }

    protected async onBeforeItemAdd(session: Session, connector: IThreeConverter): Promise<boolean> {
        return true;
    }    
    
    protected async onBeforeItemRemove(closedSession: Session, item: IThreeConverter): Promise<any> {
        return;
    }
}