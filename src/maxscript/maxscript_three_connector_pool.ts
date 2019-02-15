import { SessionPoolBase } from "../core/session_pool_base";
import { injectable } from "inversify";
import { IMaxscriptThreeConnector } from "../interfaces";
import { Session } from "../database/model/session";

@injectable()
export class MaxscriptThreeConnectorPool extends SessionPoolBase<IMaxscriptThreeConnector> {
    protected async onBeforeItemAdd(session: Session, connector: IMaxscriptThreeConnector): Promise<boolean> {
        return true;
    }    
    
    protected async onBeforeItemRemove(closedSession: Session, item: IMaxscriptThreeConnector): Promise<any> {
        return;
    }
}