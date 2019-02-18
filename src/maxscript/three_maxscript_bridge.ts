import { IMaxscriptClient, IThreeMaxscriptBridge, ISceneObjectBinding } from "../interfaces";
import { isArray } from "util";
import { multiInject } from "inversify";

// translates three json objects and changes to maxscript commands,
// to keep scene up to date with latest changes in three.js scene.
export class ThreeMaxscriptBridge implements IThreeMaxscriptBridge {
    private _maxscript: IMaxscriptClient;
    private _sceneObjectBindings: ISceneObjectBinding[];

    private _sceneJson: any;

    constructor(
        maxscript: IMaxscriptClient,
        sceneObjectBindings: ISceneObjectBinding[],
    ) {
        this._maxscript = maxscript;
        this._sceneObjectBindings = sceneObjectBindings;
    }

    public async PostScene(sceneJson: any): Promise<any> {
        this._sceneJson = sceneJson;

        let obj = sceneJson;

        console.log("TODO: // post scene: ", sceneJson);

        // this._traverse(sceneJson.object, this._convert.bind(this));

        return true;
    }

    /* private _traverse(startFrom: any, callback: (o: any) => string) {
        let queue: any[] = [ {
            object: startFrom,
            parent: null,
            level: 0
        } ];

        while (queue.length > 0) {
            let el: any = queue.shift();

            this._convert(el);

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
    } */

    /* private _convert(el: any): string {
        let obj = el.object;

        if (this._converters[obj.type]) {

        }

        switch() {
            case "Scene":
                // create Dummy object and apply matrix to it
                return "Scene";
            case "SpotLight":
                // create Light object
                // code block
                return "Light001";
            case "SpotLight":
                // create Light object
                // code block
                break;
            default:
                // code block
          }
        
        console.log("obj.uuid:   ", obj.uuid);
        console.log("obj.parent: ", el.parent ? el.parent.uuid : "(null)");
        console.log("obj.type:   ", obj.type);
        console.log("obj.name:   ", obj.name ? obj.name : "(null)");
        console.log("obj.lvl:    ", el.level);
        console.log("obj.children: ", isArray(obj.children) ? obj.children.length : "(null)" );
        console.log("\r\n");
    } */
}