import { IMaxscriptClient, IThreeMaxscriptBridge, ISceneObjectBinding, ISceneObjectBindingFactory } from "../interfaces";
import { isArray } from "util";

// translates three json objects and changes to maxscript commands,
// to keep scene up to date with latest changes in three.js scene.
export class ThreeMaxscriptBridge implements IThreeMaxscriptBridge {
    private _maxscript: IMaxscriptClient;

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
        this._maxscript = maxscript;
        this._bindingFactories = {};

        for (let i in bindingFactories) {
            let srcType = bindingFactories[i].SrcType;
            this._bindingFactories[srcType] = bindingFactories[i];
        }
    }

    public async PostScene(sceneJson: any): Promise<any> {
        console.log("TODO: // post scene: ", sceneJson);

        this._traverse(sceneJson.object, this._createObjectBinding.bind(this));

        return true;
    }

    private _traverse(startFrom: any, callback: (obj: any, parent: any) => void) {
        let queue: any[] = [ {
            object: startFrom,
            parent: null,
            level: 0
        } ];

        while (queue.length > 0) {
            let el: any = queue.shift();

            callback(el.object, el.parent);

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

    private _createObjectBinding(obj: any, parent: any): void {
        if (!this._bindingFactories[obj.type]) {
            console.warn(`object type not supported: ${obj.type}`);
            return;
        }

        let binding = this._bindingFactories[obj.type].Create(this._maxscript);
        this._bindings[obj.uuid] = binding;

        binding.Post(obj, parent);
    }
}