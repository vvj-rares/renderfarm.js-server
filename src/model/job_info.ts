class JobInfo {
    private _guid: string;
    private _workerMac: string;
    private _workerEndpoint: string;

    private _firstSeen: Date;
    private _updatedAt: Date;

    private _status: string;

    private _url: string;

    constructor(guid: string, workerEndpoint: string, workerMac: string) {
        this._guid = guid;
        this._workerEndpoint = workerEndpoint;
        this._workerMac = workerMac;

        this._firstSeen = new Date();
        this._updatedAt = new Date();

        this._status = "pending";
    }

    public get firstSeen(): Date {
        return this._firstSeen;
    }

    public get updatedAt(): Date {
        return this._updatedAt;
    }

    public get guid(): string {
        return this._guid;
    }

    public get workerMac(): string {
        return this._workerMac;
    }

    public get workerEndpoint(): string {
        return this._workerEndpoint;
    }

    public get status(): string {
        return this._status;
    }

    public set status(value: string) {
        this._status = value;
        this.touch();
    }

    public get url(): string {
        return this._url;
    }

    public set url(value: string) {
        this._url = value;
        this.touch();
    }

    public rendering(): void {
        this._status = "rendering";
        this.touch();
    }

    public cancel(): void {
        this._status = "canceled";
        this.touch();
    }

    public success(): void {
        this._status = "succeeded";
        this.touch();
    }

    public fail(): void {
        this._status = "failed";
        this.touch();
    }

    public expire(): void {
        this._status = "expired"; // this is set when session is expired and all renders are being interrupted
        this.touch();
    }

    public touch(): void {
        this._updatedAt = new Date();
    }

    public static fromJSON(obj: any): JobInfo {
        let res = new JobInfo(obj.guid, obj.workerEndpoint, obj.workerMac);

        res._firstSeen = new Date(obj.firstSeen);
        res._updatedAt = new Date(obj.lastSeen);

        res._status    = obj.status;

        res._url       = obj.url;

        return res;
    }

    public toJSON(): any {
        return {
            guid:       this._guid,
            workerEndpoint:  this._workerEndpoint,
            workerMac:  this._workerMac,

            firstSeen:  this._firstSeen.toISOString(),
            updatedAt:  this._updatedAt.toISOString(),

            status:     this._status,

            url:        this._url
        }
    }

    public toDatabase(): any {
        return {
            guid:       this._guid,
            workerEndpoint: this._workerEndpoint,
            workerMac:  this._workerMac,

            firstSeen:  this._firstSeen,
            updatedAt:  this._updatedAt,

            status:     this._status,

            url:        this._url
        }
    }
}

export { JobInfo };