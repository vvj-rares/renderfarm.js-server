import { IDbEntity } from "./base/IDbEntity";
import { isArray } from "util";
import { Worker } from "./worker";

export class Job extends IDbEntity {
    public guid: string;
    public apiKey: string;
    public createdAt: Date;
    public updatedAt: Date;
    public closedAt: Date;
    public workerGuid: string;
    public state: string;
    public closed: boolean;
    public canceled: boolean;
    public failed: boolean;
    public urls: string[];

    public workerRef: Worker;

    constructor(obj: any) {
        super();
        if (obj) {
            this.parse(obj);
        } else {
            this.closed = null;
            this.canceled = null;
            this.failed = null;
            this.closedAt = null;
            this.urls = [];
        }
    }

    public parse(obj: any) {
        this.guid       = obj.guid;
        this.apiKey     = obj.apiKey;
        this.createdAt  = obj.createdAt ? new Date(obj.createdAt) : null;
        this.updatedAt  = obj.updatedAt ? new Date(obj.updatedAt) : null;
        this.closedAt   = obj.closedAt ? new Date(obj.closedAt) : null;
        this.workerGuid = obj.workerGuid;
        this.state      = obj.state;
        this.closed     = obj.closed;
        this.canceled   = obj.canceled;
        this.failed     = obj.failed;
        this.urls       = isArray(obj.urls) ? obj.urls : [];
    }

    public toJSON() {
        let result: any = {
            guid:       this.guid,
            apiKey:     this.apiKey,
            createdAt:  this.createdAt || new Date(),
            updatedAt:  this.updatedAt || new Date(),
            closedAt:   this.closedAt || new Date(),
            workerGuid: this.workerGuid,
            state:      this.state,
            closed:     this.closed,
            canceled:   this.canceled,
            failed:     this.failed,
            urls:       this.urls,
        };

        return result;
    }

    public get filter(): any {
        return {
            guid:       this.guid
        }
    }
}
