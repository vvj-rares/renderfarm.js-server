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

    constructor(obj: any) {
        super();
        this.parse(obj);
    }

    public parse(obj: any) {
        this.mac       = obj.mac;
        this.ip        = obj.ip;
        this.port      = obj.port;
        this.endpoint  = obj.endpoint;
        this.workgroup = obj.workgroup;
        this.firstSeen = obj.firstSeen ? new Date(obj.firstSeen) : undefined;
        this.lastSeen  = obj.lastSeen ? new Date(obj.lastSeen) : undefined;
        this.cpuUsage  = obj.cpuUsage;
        this.ramUsage  = obj.ramUsage;
        this.totalRam  = obj.totalRam;
    }

    public toJSON() {
        return {
            mac:       this.mac,
            ip:        this.ip,
            port:      this.port,
            endpoint:  this.endpoint,
            workgroup: this.workgroup,
            firstSeen: this.firstSeen,
            lastSeen:  this.lastSeen,
            cpuUsage:  this.cpuUsage,
            ramUsage:  this.ramUsage,
            totalRam:  this.totalRam
        };
    }
}
