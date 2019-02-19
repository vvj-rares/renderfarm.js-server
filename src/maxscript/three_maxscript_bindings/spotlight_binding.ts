import { injectable } from "inversify";
import { IMaxscriptClient, ISceneObjectBinding, ISceneObjectBindingFactory } from "../../interfaces";
import { SceneObjectBindingBase } from "./scene_object_binding_base";

@injectable()
export class SpotLightBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return SpotLightBinding.SrcType }
    public get DstType(): string { return SpotLightBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient): ISceneObjectBinding
    {
        return new SpotLightBinding(maxscriptClient);
    }
}

export class SpotLightBinding extends SceneObjectBindingBase {
    public static SrcType: string = "SpotLight";
    public static DstType: string = "FreeSpot";

    // implemenation of ISceneObjectBinding
    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<string> {
        console.log(" >> SpotLightBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(this._objectJson);
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
