import { injectable, inject } from "inversify";
import { TYPES } from "../../types";
import { SessionPoolBase } from "../../core/session_pool_base";
import { ISessionService, IFactory, IThreeMaxscriptBridge } from "../../interfaces";
import { Session } from "../../database/model/session";

@injectable()
export class ThreeMaxscriptBridgePool extends SessionPoolBase<IThreeMaxscriptBridge> {
    constructor (
        @inject(TYPES.ISessionService) sessionService: ISessionService,
        @inject(TYPES.IThreeMaxscriptBridgeFactory) threeMaxscriptBridgeFactory: IFactory<IThreeMaxscriptBridge>,
    ) {
        super(sessionService, threeMaxscriptBridgeFactory.Create.bind(threeMaxscriptBridgeFactory));
    }

    protected async onBeforeItemAdd(session: Session, connector: IThreeMaxscriptBridge): Promise<boolean> {
        return true;
    }    
    
    protected async onBeforeItemRemove(closedSession: Session, item: IThreeMaxscriptBridge): Promise<any> {
        return;
    }
}