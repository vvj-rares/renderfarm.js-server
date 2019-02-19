import { injectable } from "inversify";
import { IMaxscriptClient, ISceneObjectBinding, ISceneObjectBindingFactory } from "../../interfaces";

@injectable()
export class SpotLightBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return SpotLightBinding.SrcType }
    public get DstType(): string { return SpotLightBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient, objectJson: any): ISceneObjectBinding
    {
        return new SpotLightBinding(objectJson, maxscriptClient);
    }
}

export class SpotLightBinding implements ISceneObjectBinding {
    private _objectJson: any;
    private _maxName: string;

    public static SrcType: string = "SpotLight";
    public static DstType: string = "FreeSpot";

    public constructor(objectJson: any, maxscriptClient: IMaxscriptClient) {
        this._objectJson = objectJson;
    }

    // implemenation of ISceneObjectBinding
    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(): Promise<string> {
        console.log(" >> SpotLightBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(this._objectJson);
    }

    public async Put(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
