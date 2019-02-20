import { IGeometryCache, IGeometryBinding } from "../interfaces";

export class GeometryCache implements IGeometryCache {
    public constructor() {
        this.Geometries = {};
    }

    public Geometries: { 
        [uuid: string]: IGeometryBinding; 
    };
}