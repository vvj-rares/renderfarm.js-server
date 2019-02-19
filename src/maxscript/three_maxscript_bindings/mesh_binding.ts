import { injectable } from "inversify";
import { ISceneObjectBinding, IMaxscriptClient, ISceneObjectBindingFactory } from "../../interfaces";

@injectable()
export class MeshBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return MeshBinding.SrcType }
    public get DstType(): string { return MeshBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient, objectJson: any): ISceneObjectBinding
    {
        return new MeshBinding(objectJson, maxscriptClient);
    }
}

export class MeshBinding implements ISceneObjectBinding {
    private _objectJson: any;
    private _maxName: string;

    public static SrcType: string = "Mesh";
    public static DstType: string = "EditableMesh";

    public constructor(objectJson: any, maxscriptClient: IMaxscriptClient) {
        this._objectJson = objectJson;
    }

    // implemenation of ISceneObjectBinding
    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(): Promise<string> {
        console.log(" >> MeshBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(this._objectJson);
    }

    public async Put(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
