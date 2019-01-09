import { IDbEntity } from "./base/IDbEntity";

export class Session extends IDbEntity {
    public apiKey: string;
    public guid: string;
    public workerEndpoint: string;
    public firstSeen: Date;
    public lastSeen: Date;
    public workspaceGuid: string;
    public closed: boolean;
    public closedAt: Date;

    constructor(obj: any) {
        super();
        if (obj) this.parse(obj);
    }

    public parse(obj: any) {
        this.apiKey         = obj.apiKey;
        this.guid           = obj.guid;
        this.workerEndpoint = obj.workerEndpoint;
        this.firstSeen      = obj.firstSeen ? new Date(obj.firstSeen) : undefined;
        this.lastSeen       = obj.lastSeen ? new Date(obj.lastSeen) : undefined;
        this.workspaceGuid  = obj.workspaceGuid;
        this.closed         = obj.closed;
        this.closedAt       = obj.closedAt ? new Date(obj.closedAt) : undefined;
    }

    public toJSON(): any {
        return {
            apiKey:         this.apiKey,
            guid:           this.guid,
            workerEndpoint: this.workerEndpoint,
            firstSeen:      this.firstSeen,
            lastSeen:       this.lastSeen,
            workspaceGuid:  this.workspaceGuid,
            closed:         this.closed,
            closedAt:       this.closedAt
        };
    }

    public get filter(): any {
        return {
            guid: this.guid
        }
    }
}
