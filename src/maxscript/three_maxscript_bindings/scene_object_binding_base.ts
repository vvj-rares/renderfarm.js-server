import { ISceneObjectBinding, IMaxscriptClient } from "../../interfaces";

export abstract class SceneObjectBindingBase implements ISceneObjectBinding {
    protected _maxscriptClient: IMaxscriptClient;

    protected _objectJson: any;

    protected _maxName: string;
    protected _maxParentName: string;

    public constructor(maxscriptClient: IMaxscriptClient) {
        this._maxscriptClient = maxscriptClient;
    }

    public abstract Get(): Promise<any>;
    public abstract Post(objectJson: any, parent: any): Promise<any>;
    public abstract Put(objectJson: any): Promise<any>;
    public abstract Delete(): Promise<any>;

    protected getObjectName(prefix: string, uuid: string) {
        let parts = uuid.split("-");
        return `${prefix}_${parts[0]}`;
    }
}