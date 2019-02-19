import { injectable } from "inversify";
import { ISceneObjectBinding, IMaxscriptClient, ISceneObjectBindingFactory } from "../../interfaces";
import { SceneObjectBindingBase } from "./scene_object_binding_base";

@injectable()
export class PerspectiveCameraBindingFactory implements ISceneObjectBindingFactory {
    public get SrcType(): string { return PerspectiveCameraBinding.SrcType }
    public get DstType(): string { return PerspectiveCameraBinding.DstType }

    public Create(maxscriptClient: IMaxscriptClient): ISceneObjectBinding
    {
        return new PerspectiveCameraBinding(maxscriptClient);
    }
}

export class PerspectiveCameraBinding extends SceneObjectBindingBase {
    public static SrcType: string = "PerspectiveCamera";
    public static DstType: string = "FreeCamera";

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<string> {
        this._maxName = super.getObjectName("Camera", objectJson.uuid);
        this._maxParentName = parentJson.uuid ? super.getObjectName("Camera", parentJson.uuid) : null;

        let camera = {
            name: this._maxName,
            matrix: objectJson.matrix,
            fov: objectJson.fov * objectJson.aspect
        };

        let res = await this._maxscriptClient.createTargetCamera(camera);
        return this._maxName;
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
