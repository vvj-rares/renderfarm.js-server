import { IThreeMaxscriptBridge, ISceneObjectBinding, ISceneObjectBindingFactory, PostSceneResult } from "../interfaces";
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
        bindingFactories: ISceneObjectBindingFactory[],
    ) {
        this._bindingFactories = {};

        for (let i in bindingFactories) {
            let srcType = bindingFactories[i].SrcType;
            this._bindingFactories[srcType] = bindingFactories[i];
        }
    }

    public async PostScene(session: Session, sceneJson: any): Promise<PostSceneResult> {
        let queue: any[] = [ {
            object: sceneJson.object,
            parent: null,
            level: 0
        } ];

        let result: PostSceneResult = {
            UnwrappedGeometry: {}
        };

        while (queue.length > 0) {
            let el: any = queue.shift();

            let postResult = await this._createObjectBinding(session, el.object, el.parent);
            if (postResult.fbxUrl) {
                console.log(" >> TODO: // store fbx url for ", el.object.geometry);
            }

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

        return result;
    }

    public async PutObject(objectJson: any): Promise<any> {
        let binding = this._bindings[ objectJson.object.uuid ];
        if (binding) {
            return await binding.Put(objectJson);
        } else {
            throw Error("can't find object binding");
        }
    }

    private async _createObjectBinding(session: Session, obj: any, parent: any) {
        if (!this._bindingFactories[obj.type]) {
            console.warn(`object type not supported: ${obj.type}`);
            return;
        }

        let binding = await this._bindingFactories[obj.type].Create(session);
        this._bindings[obj.uuid] = binding;

        return binding.Post(obj, parent);
    }
}