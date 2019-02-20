import { IGeometryBinding, IMaxscriptClient } from "../../interfaces";

export class GeometryBinding implements IGeometryBinding {
    private _maxscriptClient: IMaxscriptClient;
    private _geometryJson: any;
    private _maxName: string;

    public constructor(maxscriptClient: IMaxscriptClient) {
        this._maxscriptClient = maxscriptClient;
    }

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(geometryJson: any): Promise<string> {
        this._geometryJson = geometryJson;
        console.log(" >> GeometryBinding takes json, and sends it to remote maxscript");
        return JSON.stringify(geometryJson);
    }

    public async Put(geometryJson: any): Promise<any> {
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
