import { IDbEntity } from "./base/IDbEntity";

export class Worker extends IDbEntity {
    public mac: string;
    public ip: string;
    public port: number;
    public endpoint: string;
    public workgroup: string;
    public firstSeen: Date;
    public lastSeen: Date;
    public cpuUsage: number;
    public ramUsage: number;
    public totalRam: number;
    public sessionGuid: string;

    constructor(obj: any) {
        super();
        if (obj) {
            this.parse(obj);
        }
    }

    public parse(obj: any) {
        this.mac       = obj.mac;
        this.ip        = obj.ip;
        this.port      = obj.port;
        this.endpoint  = `${obj.ip}:${obj.port}`;
        this.workgroup = obj.workgroup;
        this.firstSeen = obj.firstSeen ? new Date(obj.firstSeen) : undefined;
        this.lastSeen  = obj.lastSeen ? new Date(obj.lastSeen) : undefined;
        this.cpuUsage  = obj.cpuUsage;
        this.ramUsage  = obj.ramUsage;
        this.totalRam  = obj.totalRam;

        if (obj.sessionGuid) {
            this.sessionGuid = obj.sessionGuid;
        }
    }

    public toJSON() {
        let result: any = {
            mac:       this.mac,
            ip:        this.ip,
            port:      this.port,
            endpoint:  `${this.ip}:${this.port}`,
            workgroup: this.workgroup,
            firstSeen: this.firstSeen || new Date(),
            lastSeen:  this.lastSeen || new Date(),
            cpuUsage:  this.cpuUsage,
            ramUsage:  this.ramUsage,
            totalRam:  this.totalRam
        };

        if (this.sessionGuid) {
            result.sessionGuid = this.sessionGuid;
        }

        return result;
    }

    public get filter(): any {
        return {
            mac:       this.mac,
            ip:        this.ip,
            port:      this.port,
            workgroup: this.workgroup
        }
    }
}
