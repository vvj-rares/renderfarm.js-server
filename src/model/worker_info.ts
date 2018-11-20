class WorkerInfo {
    private _guid: string;
    private _firstSeen: Date;
    private _lastSeen: Date;
    private _mac: string;
    private _cpuUsage: number;
    private _ramUsage: number;
    private _totalRam: number;
    private _ip: string;
    private _session: string;

    constructor(guid: string, mac: string) {
        this._firstSeen = new Date();
        this._lastSeen = new Date();
        this._guid = guid;
        this._mac = mac;
    }

    public get guid(): string {
        return this._guid;
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

    public set ip(value: string) {
        this._ip = value;
    }

    public set session(value: string) {
        this._session = value;
    }

    public touch(): void {
        this._lastSeen = new Date();
    }

    public static fromJSON(obj: any): WorkerInfo {
        let res = new WorkerInfo(obj.guid, obj.mac);

        res._firstSeen = new Date(obj.firstSeen);
        res._lastSeen  = new Date(obj.lastSeen);

        return res;
    }

    public toJSON(): any {
        return {
            guid:       this._guid,
            session:    this._session,
            ip:         this._ip,
            mac:        this._mac,
            firstSeen:  this._firstSeen.toISOString(),
            lastSeen:   this._lastSeen.toISOString(),
            cpuUsage:   this._cpuUsage,
            ramUsage:   this._ramUsage,
            totalRam:   this._totalRam
        }
    }
}

export { WorkerInfo };