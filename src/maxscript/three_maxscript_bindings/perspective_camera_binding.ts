import { injectable } from "inversify";
import { ISceneObjectBinding, IMaxscriptClient, ISceneObjectBindingFactory } from "../../interfaces";

@injectable()
export class PerspectiveCameraBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return PerspectiveCameraBinding.SrcType }
    public get DstType(): string { return PerspectiveCameraBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient, objectJson: any): ISceneObjectBinding
    {
        return new PerspectiveCameraBinding(objectJson, maxscriptClient);
    }
}

export class PerspectiveCameraBinding implements ISceneObjectBinding {
    private _objectJson: any;
    private _maxName: string;

    public static SrcType: string = "PerspectiveCamera";
    public static DstType: string = "FreeCamera";

    public constructor(objectJson: any, maxscriptClient: IMaxscriptClient) {
        this._objectJson = objectJson;
    }

    // implemenation of ISceneObjectBinding
    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(): Promise<string> {
        console.log(" >> PerspectiveCameraBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(this._objectJson);
    }

    public async Put(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
