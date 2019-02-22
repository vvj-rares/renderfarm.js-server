import { SceneObjectBindingBase } from "./scene_object_binding_base";

export class MeshBinding extends SceneObjectBindingBase {
    public static SrcType: string = "Mesh";
    public static DstType: string = "EditableMesh";

    public async Get(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Post(objectJson: any, parentJson: any): Promise<string> {
        console.log(" >> MeshBinding: ", objectJson, "\r\n");
        let geometry = this._geometryCache.Geometries[objectJson.geometry];
        let material = this._materialCache.Materials[objectJson.material];

        if (!geometry) {
            throw Error(`geometry not cached: ${objectJson.geometry}`);
        }

        if (!material) {
            throw Error(`material not cached: ${objectJson.material}`);
        }

        let meshName = this.getObjectName(objectJson);
        await geometry.Post(meshName);

        console.log(" >> resolved geometry and material for mesh: \r\n", geometry, "\r\n", material);
        return JSON.stringify(this._objectJson);
    }

    public async Put(objectJson: any): Promise<any> {
        throw new Error("Method not implemented.");
    }

    public async Delete(): Promise<any> {
        throw new Error("Method not implemented.");
    }
}
