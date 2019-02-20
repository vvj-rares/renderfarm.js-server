import { IMaterialCache, IMaterialBinding } from "../interfaces";

export class MaterialCache implements IMaterialCache {
    public constructor() {
        this.Materials = {};
    }

    public Materials: { 
        [uuid: string]: IMaterialBinding; 
    };
}