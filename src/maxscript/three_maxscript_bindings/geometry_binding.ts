import { IGeometryBinding, IMaxscriptClient } from "../../interfaces";

export class GeometryBinding implements IGeometryBinding {
    private _maxscriptClient: IMaxscriptClient;
    private _geometryJson: any;
    private _maxInstances: string[] = [];

    public constructor(
        maxscriptClient: IMaxscriptClient,
        geometryJson: any,
    ) {
        this._maxscriptClient = maxscriptClient;
        this._geometryJson = geometryJson;
    }

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(maxName: string): Promise<string> {
        console.log(" >> GeometryBinding takes json, and sends it to remote maxscript");
        if (this._maxInstances.length === 0) {
            console.log(` >> todo: // upload BufferGeometry as ${maxName}`);
        } else {
            console.log(` >> todo: // instantiate BufferGeometr as ${maxName} from existing 3dsmax node ${this._maxInstances[0]}`);
        }
        this._maxInstances.push(maxName);

        return JSON.stringify(this._geometryJson);
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
