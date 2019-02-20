import { SceneObjectBindingBase } from "./scene_object_binding_base";

export class LineSegmentsBinding extends SceneObjectBindingBase {
    public static SrcType: string = "LineSegments";
    public static DstType: string = "SplineShape";

    // implemenation of ISceneObjectBinding
    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<string> {
        console.log(" >> LineSegmentsBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(this._objectJson);
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
