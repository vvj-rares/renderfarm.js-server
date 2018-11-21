class WorkerInfo {
    private _firstSeen: Date;
    private _lastSeen: Date;
    private _mac: string;
    private _cpuUsage: number;
    private _ramUsage: number;
    private _totalRam: number;
    private _ip: string;

    constructor(mac: string) {
        this._firstSeen = new Date();
        this._lastSeen = new Date();
        this._mac = mac;
    }

    public get firstSeen(): Date {
        return this._firstSeen;
    }

    public get lastSeen(): Date {
        return this._lastSeen;
    }

    public get mac(): string {
        return this._mac;
    }

    public set cpuUsage(value: number) {
        this._cpuUsage = value;
    }

    public set ramUsage(value: number) {
        this._ramUsage = value;
    }

    public set totalRam(value: number) {
        this._totalRam = value;
    }

    public get ip(): string {
        return this._ip;
    }
    public set ip(value: string) {
        this._ip = value;
    }

    public touch(): void {
        this._lastSeen = new Date();
    }

    public static fromJSON(obj: any): WorkerInfo {
        let res = new WorkerInfo(obj.mac);

        res._ip        = obj.ip;

        res._firstSeen = new Date(obj.firstSeen);
        res._lastSeen  = new Date(obj.lastSeen);

        res._cpuUsage  = obj.cpuUsage;
        res._ramUsage  = obj.ramUsage;
        res._totalRam  = obj.totalRam;

        return res;
    }

    public toJSON(): any {
        return {
            ip:         this._ip,
            mac:        this._mac,
            firstSeen:  this._firstSeen.toISOString(),
            lastSeen:   this._lastSeen.toISOString(),
            cpuUsage:   this._cpuUsage,
            ramUsage:   this._ramUsage,
            totalRam:   this._totalRam,
        }
    }

    public toDatabase(): any {
        return {
            ip:         this._ip,
            mac:        this._mac,
            firstSeen:  this._firstSeen,
            lastSeen:   this._lastSeen,
            totalRam:   this._totalRam,
        }
    }
}

export { WorkerInfo };