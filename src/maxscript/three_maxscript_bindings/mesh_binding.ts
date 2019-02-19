import { injectable } from "inversify";
import { ISceneObjectBinding, IMaxscriptClient, ISceneObjectBindingFactory } from "../../interfaces";
import { SceneObjectBindingBase } from "./scene_object_binding_base";

@injectable()
export class MeshBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return MeshBinding.SrcType }
    public get DstType(): string { return MeshBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient): ISceneObjectBinding
    {
        return new MeshBinding(maxscriptClient);
    }
}

export class MeshBinding extends SceneObjectBindingBase {
    public static SrcType: string = "Mesh";
    public static DstType: string = "EditableMesh";

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<string> {
        console.log(" >> MeshBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(this._objectJson);
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
