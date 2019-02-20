import { IGeometryCache, IGeometryBinding } from "../../interfaces";

export class GeometryCache implements IGeometryCache {
    public Geometries: { 
        [uuid: string]: IGeometryBinding; 
    };
}