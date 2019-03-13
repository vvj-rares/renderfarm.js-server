import { SceneObjectBindingBase } from "./scene_object_binding_base";
import { PostResult } from "../../interfaces";

export class LineSegmentsBinding extends SceneObjectBindingBase {
    public static SrcType: string = "LineSegments";
    public static DstType: string = "SplineShape";

    // implemenation of ISceneObjectBinding
    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<PostResult> {
        console.log(" >> LineSegmentsBinding takes json, and sends it to remote maxscript");
        return {};
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
