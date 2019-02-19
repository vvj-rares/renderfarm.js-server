import { injectable } from "inversify";
import { ISceneObjectBinding, IMaxscriptClient, ISceneObjectBindingFactory } from "../../interfaces";
import { SceneObjectBindingBase } from "./scene_object_binding_base";

@injectable()
export class SceneBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return SceneBinding.SrcType }
    public get DstType(): string { return SceneBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient): ISceneObjectBinding
    {
        return new SceneBinding(maxscriptClient);
    }
}

export class SceneBinding extends SceneObjectBindingBase {
    public static SrcType: string = "Scene";
    public static DstType: string = "Dummy";

    // implemenation of ISceneObjectBinding
    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<string> {
        console.log(" >> SceneBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(this._objectJson);
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
