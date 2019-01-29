import { IDbEntity } from "./base/IDbEntity";
import { Worker } from "./worker";
import { Workspace } from "./workspace";

export class Session extends IDbEntity {
    public apiKey: string;
    public guid: string;
    public workerGuid: string;
    public firstSeen: Date;
    public lastSeen: Date;
    public workspaceGuid: string;
    public closed?: boolean;
    public expired?: boolean;
    public closedAt?: Date;
    public failed?: boolean;
    public failReason?: string;

    public workerRef?: Worker;
    public workspaceRef?: Workspace;

    constructor(obj: any) {
        super();
        if (obj) this.parse(obj);
    }

    public parse(obj: any) {
        this.apiKey         = obj.apiKey;
        this.guid           = obj.guid;
        this.workerGuid     = obj.workerGuid;
        this.firstSeen      = obj.firstSeen ? new Date(obj.firstSeen) : undefined;
        this.lastSeen       = obj.lastSeen ? new Date(obj.lastSeen) : undefined;
        this.workspaceGuid  = obj.workspaceGuid;
        this.closed         = obj.closed;
        this.expired        = obj.expired;
        this.closedAt       = obj.closedAt ? new Date(obj.closedAt) : undefined;
        this.failed         = obj.failed;
        this.failReason     = obj.failReason;
    }

    public toJSON(): any {
        let result: any = {
            apiKey:         this.apiKey,
            guid:           this.guid,
            workerGuid:     this.workerGuid,
            firstSeen:      this.firstSeen,
            lastSeen:       this.lastSeen,
            workspaceGuid:  this.workspaceGuid,
            closed:         this.closed,
            expired:        this.expired,
            closedAt:       this.closedAt,
            failed:         this.failed,
            failReason:     this.failReason
        };

        return result;
    }

    public get filter(): any {
        return {
            guid: this.guid
        }
    }
}
