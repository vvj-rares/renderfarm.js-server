import { injectable } from "inversify";
import { IMaterialCache, IFactory } from "../../interfaces";
import { Session } from "../../database/model/session";
import { MaterialCache } from "../../maxscript/three_maxscript_bindings/material_cache";

@injectable()
export class MaterialCacheFactory implements IFactory<IMaterialCache> {
    public async Create(session: Session): Promise<IMaterialCache> {
        return new MaterialCache();
    }
}
