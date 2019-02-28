import { injectable, inject, multiInject } from "inversify";
import { TYPES } from "../types";
import { IFactory, IMaxscriptClient, ISessionPool, IThreeMaxscriptBridge, ISceneObjectBindingFactory } from "../interfaces";
import { Session } from "../database/model/session";
import { ThreeMaxscriptBridge } from "../maxscript/three_maxscript_bridge";

@injectable()
export class ThreeMaxscriptBridgeFactory implements IFactory<IThreeMaxscriptBridge> {
    private _bindingFactories: ISceneObjectBindingFactory[];

    constructor(
        @multiInject(TYPES.ISceneObjectBindingFactory) bindingFactories: ISceneObjectBindingFactory[],
    ) {
        this._bindingFactories = bindingFactories;
    }

    public async Create(session: Session): Promise<IThreeMaxscriptBridge> {
        return new ThreeMaxscriptBridge(this._bindingFactories);
    }
}
