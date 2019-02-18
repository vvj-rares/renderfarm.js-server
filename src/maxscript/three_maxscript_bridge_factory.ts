import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IFactory, IMaxscriptClient, ISessionPool, IThreeMaxscriptBridge } from "../interfaces";
import { Session } from "../database/model/session";
import { ThreeMaxscriptBridge } from "./three_maxscript_bridge";

@injectable()
export class ThreeMaxscriptBridgeFactory implements IFactory<IThreeMaxscriptBridge> {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;

    constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
    }

    public async Create(session: Session): Promise<IThreeMaxscriptBridge> {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        return new ThreeMaxscriptBridge(maxscript);
    }
}
