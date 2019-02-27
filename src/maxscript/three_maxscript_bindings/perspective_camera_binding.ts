import { SceneObjectBindingBase } from "./scene_object_binding_base";

export class PerspectiveCameraBinding extends SceneObjectBindingBase {
    public static SrcType: string = "PerspectiveCamera";
    public static DstType: string = "FreeCamera";

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<string> {
        let cameraName = this.getObjectName(objectJson);
        let parentName = this.getObjectName(parentJson);

        await this._maxscriptClient.createTargetCamera(cameraName, objectJson);

        await this._maxscriptClient.linkToParent(cameraName, parentName);
        await this._maxscriptClient.setObjectMatrix(cameraName, objectJson.matrix);

        this._maxName = cameraName;
        this._maxParentName = parentName;

        return cameraName;
    }

    public async Put(objectJson: any): Promise<any> {
        await this._maxscriptClient.updateTargetCamera(this._maxName, objectJson);
        await this._maxscriptClient.setObjectMatrix(this._maxName, objectJson.matrix);

        return this._maxName;
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
