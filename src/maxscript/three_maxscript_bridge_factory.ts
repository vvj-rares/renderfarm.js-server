import { injectable, inject, multiInject } from "inversify";
import { TYPES } from "../types";
import { IFactory, IMaxscriptClient, ISessionPool, IThreeMaxscriptBridge, ISceneObjectBinding } from "../interfaces";
import { Session } from "../database/model/session";
import { ThreeMaxscriptBridge } from "./three_maxscript_bridge";

@injectable()
export class ThreeMaxscriptBridgeFactory implements IFactory<IThreeMaxscriptBridge> {
    private _maxscriptClientPool: ISessionPool<IMaxscriptClient>;
    private _sceneObjectBindings: ISceneObjectBinding[];

    constructor(
        @inject(TYPES.IMaxscriptClientPool) maxscriptClientPool: ISessionPool<IMaxscriptClient>,
        @multiInject(TYPES.ISceneObjectBinding) sceneObjectBindings: ISceneObjectBinding[],
    ) {
        this._maxscriptClientPool = maxscriptClientPool;
        this._sceneObjectBindings = sceneObjectBindings;
    }

    public async Create(session: Session): Promise<IThreeMaxscriptBridge> {
        let maxscript: IMaxscriptClient = await this._maxscriptClientPool.Get(session);
        return new ThreeMaxscriptBridge(maxscript, this._sceneObjectBindings);
    }
}
