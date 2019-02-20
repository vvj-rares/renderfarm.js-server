import { IMaterialCache, IMaterialBinding } from "../../interfaces";

export class MaterialCache implements IMaterialCache {
    public Materials: { 
        [uuid: string]: IMaterialBinding; 
    };
}