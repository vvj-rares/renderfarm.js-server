import { IDbEntity } from "./base/IDbEntity";

export class ApiKey extends IDbEntity {
    public apiKey: string;
    public userGuid: string;
    public lastSeen: Date;

    constructor(obj: any) {
        super();
        this.parse(obj);
    }

    public parse(obj: any) {
        this.apiKey   = obj.apiKey;
        this.userGuid = obj.userGuid;
        this.lastSeen = obj.lastSeen ? new Date(obj.lastSeen) : null;
    }

    public toJSON() {
        return {
            apiKey:   this.apiKey,
            userGuid: this.userGuid,
            lastSeen: this.lastSeen
        };
    }

    public get filter(): any {
        return {
            apiKey: this.apiKey
        }
    }
}
