class JobInfo {
    private _guid: string;
    private _sessionGuid: string;
    private _workerMac: string;
    private _workerEndpoint: string;

    private _firstSeen: Date;
    private _updatedAt: Date;

    private _status: string;

    private _url: string;

    public static Rendering: string = "rendering";
    public static Canceled:  string = "canceled";
    public static Succeeded: string = "succeeded";
    public static Failed:    string = "failed";
    public static Expired:   string = "expired";

    constructor(guid: string, sessionGuid: string, workerEndpoint: string, workerMac: string) {
        this._guid = guid;
        this._sessionGuid = sessionGuid;
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

    public get sessionGuid(): string {
        return this._sessionGuid;
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

    public vrayProgress: string;

    public get url(): string {
        return this._url;
    }

    public set url(value: string) {
        this._url = value;
        this.touch();
    }

    public rendering(): void {
        this._status = JobInfo.Rendering;
        this.touch();
    }

    public cancel(): void {
        this._status = JobInfo.Canceled;
        this.touch();
    }

    public success(): void {
        this._status = JobInfo.Succeeded;
        this.touch();
    }

    public fail(): void {
        this._status = JobInfo.Failed;
        this.touch();
    }

    public expire(): void {
        this._status = JobInfo.Expired; // this is set when session is expired and all renders are being interrupted
        this.touch();
    }

    public touch(): void {
        this._updatedAt = new Date();
    }

    public static fromJSON(obj: any): JobInfo { // this will be used to parse obj from database into JobInfo instance
        let res = new JobInfo(obj.guid, obj.sessionGuid, obj.workerEndpoint, obj.workerMac);

        res._firstSeen = new Date(obj.firstSeen);
        res._updatedAt = new Date(obj.updatedAt);

        res._status    = obj.status;
        res._url       = obj.url;

        return res;
    }

    public toJSON(): any { // this will be returned in browser, so don't pass ip and mac addresses
        const fix = 10000; //round values to 4 digits like 0.0000

        let timeDiffMs = (new Date().getTime() - this._firstSeen.getTime());
        let elapsed = Math.round( fix * timeDiffMs / 1000 / 60 ) / fix;

        return {
            guid:           this._guid,
            sessionGuid:    this._sessionGuid,
            firstSeen:      this._firstSeen.toISOString(),
            updatedAt:      this._updatedAt.toISOString(),
            elapsed:        elapsed,
            status:         this._status,
            vrayProgress:   this.vrayProgress,
            url:            this._url ? this._url : undefined
        }
    }

    public toDatabase(): any { // convert JobInfo instance into json object to be saved in database
        return {
            guid:           this._guid,
            sessionGuid:    this._sessionGuid,
            workerEndpoint: this._workerEndpoint,
            workerMac:      this._workerMac,
            firstSeen:      this._firstSeen,
            updatedAt:      this._updatedAt,
            status:         this._status,
            url:            this._url
        }
    }
}

export { JobInfo };