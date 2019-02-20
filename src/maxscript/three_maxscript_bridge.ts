import { IMaxscriptClient, IThreeMaxscriptBridge, ISceneObjectBinding, ISceneObjectBindingFactory } from "../interfaces";
import { isArray } from "util";
import { Session } from "../database/model/session";

// translates three json objects and changes to maxscript commands,
// to keep scene up to date with latest changes in three.js scene.
export class ThreeMaxscriptBridge implements IThreeMaxscriptBridge {
    private _bindingFactories: {
        [srcType: string]: ISceneObjectBindingFactory;
    } = {};

    private _bindings: {
        [uuid: string]: ISceneObjectBinding;
    } = {};

    constructor(
        maxscript: IMaxscriptClient,
        bindingFactories: ISceneObjectBindingFactory[],
    ) {
        this._bindingFactories = {};

        for (let i in bindingFactories) {
            let srcType = bindingFactories[i].SrcType;
            this._bindingFactories[srcType] = bindingFactories[i];
        }
    }

    public async PostScene(session: Session, sceneJson: any): Promise<any> {
        console.log("TODO: // post scene: ", sceneJson);

        this._traverse(session, sceneJson.object, this._createObjectBinding.bind(this));

        return true;
    }

    private async _traverse(session: Session, startFrom: any, callback: (session: Session, obj: any, parent: any) => Promise<any>) {
        let queue: any[] = [ {
            object: startFrom,
            parent: null,
            level: 0
        } ];

        while (queue.length > 0) {
            let el: any = queue.shift();

            await callback(session, el.object, el.parent);

            let obj = el.object;
            if (isArray(obj.children)) {
                for (let c in obj.children) {
                    queue.push({
                        object: obj.children[c],
                        parent: obj,
                        level: el.level + 1
                    });
                }
            }
        }
    }

    private async _createObjectBinding(session: Session, obj: any, parent: any) {
        if (!this._bindingFactories[obj.type]) {
            console.warn(`object type not supported: ${obj.type}`);
            return;
        }

        let binding = await this._bindingFactories[obj.type].Create(session);
        this._bindings[obj.uuid] = binding;

        binding.Post(obj, parent);
    }
}