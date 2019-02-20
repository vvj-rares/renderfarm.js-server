import { injectable } from "inversify";
import { IGeometryCache, IFactory } from "../../interfaces";
import { Session } from "../../database/model/session";
import { GeometryCache } from "../../maxscript/three_maxscript_bindings/geometry_cache";

@injectable()
export class GeometryCacheFactory implements IFactory<IGeometryCache> {
    public async Create(session: Session): Promise<IGeometryCache> {
        return new GeometryCache();
    }
}
