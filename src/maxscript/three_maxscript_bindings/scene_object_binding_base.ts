import { ISceneObjectBinding, IMaxscriptClient, IGeometryCache, IMaterialCache } from "../../interfaces";

export abstract class SceneObjectBindingBase implements ISceneObjectBinding {
    protected _maxscriptClient: IMaxscriptClient;
    protected _geometryCache: IGeometryCache;
    protected _materialCache: IMaterialCache;

    protected _objectJson: any;

    protected _maxName: string;
    protected _maxParentName: string;

    public constructor(
        maxscriptClient: IMaxscriptClient,
        geometryCache: IGeometryCache,
        materialCache: IMaterialCache,
    ) {
        this._maxscriptClient = maxscriptClient;
        this._geometryCache = geometryCache;
        this._materialCache = materialCache;
    }

    public abstract Get(): Promise<any>;
    public abstract Post(objectJson: any, parent: any): Promise<any>;
    public abstract Put(objectJson: any): Promise<any>;
    public abstract Delete(): Promise<any>;

    protected getObjectName(obj: any): string {
        if (obj.name) {
            return obj.name;
        }

        let parts = obj.uuid.split("-");
        return `${obj.type}_${parts[0]}`;
    }
}