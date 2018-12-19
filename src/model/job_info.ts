class JobInfo {
    private _guid: string;
    private _workerMac: string;
    private _workerEndpoint: string;

    private _firstSeen: Date;
    private _updatedAt: Date;

    private _progressiveMaxRenderTime: number;
    private _progressiveNoiseThreshold: number;

    private _status: string;

    private _url: string;

    constructor(guid: string, workerEndpoint: string, workerMac: string) {
        this._guid = guid;
        this._workerEndpoint = workerEndpoint;
        this._workerMac = workerMac;

        this._firstSeen = new Date();
        this._updatedAt = new Date();

        this._status = "pending";

        this._progressiveMaxRenderTime = 5; // 5 minutes by default
        this._progressiveNoiseThreshold = 0.005;
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

    public get progressiveMaxRenderTime(): number {
        return this._progressiveMaxRenderTime;
    }

    public set progressiveMaxRenderTime(value: number) {
        this._progressiveMaxRenderTime = value;
        this.touch();
    }

    public get progressiveNoiseThreshold(): number {
        return this._progressiveNoiseThreshold;
    }

    public set progressiveNoiseThreshold(value: number) {
        this._progressiveNoiseThreshold = value;
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

    public static fromJSON(obj: any): JobInfo { // this will be used to parse obj from database into JobInfo instance
        let res = new JobInfo(obj.guid, obj.workerEndpoint, obj.workerMac);

        res._firstSeen = new Date(obj.firstSeen);
        res._updatedAt = new Date(obj.updatedAt);

        res._progressiveMaxRenderTime  = obj.progressiveMaxRenderTime;
        res._progressiveNoiseThreshold = obj.progressiveNoiseThreshold;

        res._status    = obj.status;

        res._url       = obj.url;

        return res;
    }

    public toJSON(): any { // this will be returned in browser, so don't pass ip and mac addresses
        const fix = 10000; //round values to 4 digits like 0.0000

        let timeDiffMs = (new Date().getTime() - this._firstSeen.getTime());
        let elapsed = Math.round( fix * timeDiffMs / 1000 / 60 ) / fix;

        let progress = this._progressiveMaxRenderTime > 0 
                ? elapsed / this._progressiveMaxRenderTime 
                : undefined;

        if (progress) {
            progress = Math.round(fix * progress) / fix;
        }

        if (progress && progress >= 0.9995) {
            progress = 0.9995
        }

        if (this._status === "succeeded") {
            progress = 1.0;
        }

        return {
            guid:       this._guid,
            firstSeen:  this._firstSeen.toISOString(),
            updatedAt:  this._updatedAt.toISOString(),
            elapsed:    elapsed,
            progress:   progress,
            status:     this._status,
            url:        this._url ? this._url : undefined
        }
    }

    public toDatabase(): any { // convert JobInfo instance into json object to be saved in database
        return {
            guid:       this._guid,
            workerEndpoint: this._workerEndpoint,
            workerMac:  this._workerMac,

            firstSeen:  this._firstSeen,
            updatedAt:  this._updatedAt,

            progressiveMaxRenderTime: this._progressiveMaxRenderTime,
            progressiveNoiseThreshold: this._progressiveNoiseThreshold,

            status:     this._status,

            url:        this._url
        }
    }
}

export { JobInfo };