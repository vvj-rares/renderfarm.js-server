import { SceneObjectBindingBase } from "./scene_object_binding_base";
import { PostResult } from "../../interfaces";

export class SceneBinding extends SceneObjectBindingBase {
    public static SrcType: string = "Scene";
    public static DstType: string = "Dummy";

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<PostResult> {
        this._maxName = super.getObjectName(objectJson);
        this._maxParentName = undefined;

        let res = await this._maxscriptClient.createSceneRoot(this._maxName);
        return {};
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
