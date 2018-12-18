class SessionInfo {
    private _apiKey: string;
    private _guid: string;
    private _workerEndpoint: string;

    private _firstSeen: Date;
    private _lastSeen: Date;

    constructor(apiKey: string, guid: string, workerEndpoint: string) {
        this._apiKey = apiKey;
        this._guid = guid;
        this._workerEndpoint = workerEndpoint;

        this._firstSeen = new Date();
        this._lastSeen = new Date();
    }

    public get firstSeen(): Date {
        return this._firstSeen;
    }

    public get lastSeen(): Date {
        return this._lastSeen;
    }

    public get apiKey(): string {
        return this._apiKey;
    }

    public get guid(): string {
        return this._guid;
    }

    public get workerEndpoint(): string {
        return this._workerEndpoint;
    }

    public touch(): void {
        this._lastSeen = new Date();
    }

    public static fromJSON(obj: any): SessionInfo {
        let res = new SessionInfo(obj.apiKey, obj.guid, obj.workerEndpoint);

        res._firstSeen = new Date(obj.firstSeen);
        res._lastSeen  = new Date(obj.lastSeen);

        return res;
    }

    public toJSON(): any {
        return {
            apiKey:     this._apiKey,
            guid:       this._guid,
            workerEndpoint:  this._workerEndpoint,

            firstSeen:  this._firstSeen.toISOString(),
            lastSeen:   this._lastSeen.toISOString()
        }
    }

    public toDatabase(): any {
        return {
            apiKey:     this._apiKey,
            guid:       this._guid,
            workerEndpoint: this._workerEndpoint,

            firstSeen:  this._firstSeen,
            lastSeen:   this._lastSeen
        }
    }
}

export { SessionInfo };