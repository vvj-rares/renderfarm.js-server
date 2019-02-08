import { IDbEntity } from "./base/IDbEntity";

export class Workspace extends IDbEntity {
    public guid: string;
    public apiKey: string;
    public workgroup: string;
    public homeDir: string;
    public name: string;
    public lastSeen: Date;

    constructor(obj: any) {
        super();
        if (obj) {
            this.parse(obj);
        }
    }

    public parse(obj: any) {
        this.guid      = obj.guid;
        this.apiKey    = obj.apiKey;
        this.workgroup = obj.workgroup;
        this.homeDir   = obj.homeDir;
        this.name      = obj.name;
        this.lastSeen  = obj.lastSeen ? new Date(obj.lastSeen) : undefined;
    }

    public toJSON() {
        let result = {
            guid:      this.guid,
            apiKey:    this.apiKey,
            workgroup: this.workgroup,
            homeDir:   this.homeDir,
            name:      this.name,
            lastSeen:  this.lastSeen
        };

        return this.dropNulls(result);
    }

    public get filter(): any {
        return {
            guid:       this.guid,
            workgroup: this.workgroup
        }
    }
}
