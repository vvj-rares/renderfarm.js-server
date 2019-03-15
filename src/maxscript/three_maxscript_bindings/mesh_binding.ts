import { SceneObjectBindingBase } from "./scene_object_binding_base";
import { PostResult } from "../../interfaces";

export class MeshBinding extends SceneObjectBindingBase {
    public static SrcType: string = "Mesh";
    public static DstType: string = "EditableMesh";

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<PostResult> {
        console.log(" >> MeshBinding:\r\nobjectJson=", objectJson, "\r\nparentJson=", parentJson, "\r\n");
        let geometry = this._geometryCache.Geometries[objectJson.geometry];
        let material = this._materialCache.Materials[objectJson.material];

        if (!geometry) {
            throw Error(`geometry not cached: ${objectJson.geometry}`);
        }

        if (!material) {
            throw Error(`material not cached: ${objectJson.material}`);
        }

        let meshName = this.getObjectName(objectJson);
        let parentName = this.getObjectName(parentJson);

        let postResult = await geometry.Post(meshName);

        await this._maxscriptClient.linkToParent(meshName, parentName);
        await this._maxscriptClient.setObjectMatrix(meshName, objectJson.matrix);

        this._maxName = meshName;
        this._maxParentName = parentName;

        return postResult;
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
