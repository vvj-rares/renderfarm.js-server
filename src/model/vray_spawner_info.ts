class VraySpawnerInfo {
    private _firstSeen: Date;
    private _lastSeen: Date;
    private _ip: string;
    private _mac: string;
    private _cpuUsage: number;
    private _ramUsage: number;
    private _totalRam: number;
    private _workgroup: string;

    constructor(mac: string, ip: string, workgroup: string) {
        this._firstSeen = new Date();
        this._lastSeen = new Date();
        this._ip = ip;
        this._mac = mac;
        this._workgroup = workgroup;
    }

    public get firstSeen(): Date {
        return this._firstSeen;
    }

    public get lastSeen(): Date {
        return this._lastSeen;
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

    public get mac(): string {
        return this._mac;
    }

    public get workgroup(): string {
        return this._workgroup;
    }

    public touch(): void {
        this._lastSeen = new Date();
    }

    public static fromJSON(obj: any): VraySpawnerInfo {
        let res = new VraySpawnerInfo(obj.mac, obj.ip, obj.workgroup);

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
            workgroup:  this.workgroup,
            firstSeen:  this._firstSeen.toISOString(),
            lastSeen:   this._lastSeen.toISOString(),
            cpuUsage:   this._cpuUsage,
            ramUsage:   this._ramUsage,
            totalRam:   this._totalRam,
        }
    }

    public toDatabase(): any {
        return {
            mac:        this._mac,
            ip:         this._ip,
            workgroup:  this.workgroup,
            firstSeen:  this._firstSeen,
            lastSeen:   this._lastSeen,
            cpuUsage:   this._cpuUsage,
            ramUsage:   this._ramUsage,
            totalRam:   this._totalRam,
        }
    }
}

export { VraySpawnerInfo };