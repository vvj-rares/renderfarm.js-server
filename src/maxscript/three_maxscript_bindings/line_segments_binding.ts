import { injectable } from "inversify";
import { ISceneObjectBinding, IMaxscriptClient, ISceneObjectBindingFactory } from "../../interfaces";
import { SceneObjectBindingBase } from "./scene_object_binding_base";

@injectable()
export class LineSegmentsBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return LineSegmentsBinding.SrcType }
    public get DstType(): string { return LineSegmentsBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient): ISceneObjectBinding
    {
        return new LineSegmentsBinding(maxscriptClient);
    }
}

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
