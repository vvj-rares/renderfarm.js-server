import { IGeometryBinding, IMaxscriptClient, ISettings } from "../../interfaces";

export class GeometryBinding implements IGeometryBinding {
    private _settings: ISettings;
    private _maxscriptClient: IMaxscriptClient;
    private _geometryJson: any;
    private _maxInstances: string[] = [];

    public constructor(
        settings: ISettings,
        maxscriptClient: IMaxscriptClient,
        geometryJson: any,
    ) {
        this._settings = settings;
        this._maxscriptClient = maxscriptClient;
        this._geometryJson = geometryJson;
    }

    public get ThreeJson(): any {
        return this._geometryJson;
    }

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(maxName: string): Promise<any> {
        console.log(" >> GeometryBinding takes json, and sends it to remote maxscript");
        if (this._maxInstances.length === 0) {
            console.log(` >> todo: // upload BufferGeometry as ${maxName}`);
            let downloadUrl = `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/three/geometry/${this._geometryJson.uuid}`;
            let filename = `${this._geometryJson.uuid}.json`;
            let resd = await this._maxscriptClient.downloadJson(downloadUrl, `C:\\\\Temp\\\\${filename}`);
            console.log(resd);
            let resi = await this._maxscriptClient.importMesh(`C:\\\\Temp\\\\${filename}`, maxName);
            console.log(resi);
            console.log(` >> tell 3dsmax to download from ${downloadUrl} into ${maxName}`);
        } else {
            console.log(` >> todo: // instantiate BufferGeometr as ${maxName} from existing 3dsmax node ${this._maxInstances[0]}`);
            let resc = await this._maxscriptClient.cloneInstance(this._maxInstances[0], maxName);
        }
        this._maxInstances.push(maxName);
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
