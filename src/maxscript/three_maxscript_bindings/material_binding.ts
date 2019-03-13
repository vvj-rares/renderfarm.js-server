import { IMaterialBinding, IMaxscriptClient, PostResult } from "../../interfaces";

export class MaterialBinding implements IMaterialBinding {
    private _maxscriptClient: IMaxscriptClient;
    private _materialJson: any;
    private _maxMaterialName: string;

    public constructor(maxscriptClient: IMaxscriptClient) {
        this._maxscriptClient = maxscriptClient;
    }

    public get ThreeJson(): any {
        return this._materialJson;
    }

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(materialJson: any): Promise<PostResult> {
        this._materialJson = materialJson;
        console.log(" >> MaterialBinding takes json, and sends it to remote maxscript");
        return {};
    }

    public async Put(materialJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    protected getObjectName(obj: any) {
        let parts = obj.uuid.split("-");
        return `${obj.type}_${parts[0]}`;
    }
}
