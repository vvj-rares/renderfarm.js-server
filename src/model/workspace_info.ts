class WorkspaceInfo {
    private _apiKey: string;
    private _guid: string;
    private _host: string;
    private _homeDir: string;
    private _name: string;
    private _lastSeen: Date;

    constructor(apiKey: string, guid: string) {
        this._apiKey = apiKey;
        this._guid = guid;
        this._lastSeen = new Date();
    }

    public get apiKey(): string {
        return this._apiKey;
    }

    public get guid(): string {
        return this._guid;
    }

    public get host(): string {
        return this._host;
    }

    public get homeDir(): string {
        return this._homeDir;
    }

    public get name(): string {
        return this._name;
    }

    public get lastSeen(): Date {
        return this._lastSeen;
    }

    public static fromJSON(obj: any): WorkspaceInfo {
        let res = new WorkspaceInfo(obj.apiKey, obj.guid);

        res._host = obj.host;
        res._homeDir  = obj.homeDir;
        res._name  = obj.name;
        res._lastSeen  = new Date(obj.lastSeen);

        return res;
    }

    public toJSON(): any {
        return {
            apiKey:        this._apiKey,
            guid:          this._guid,

            host:          this._host,
            homeDir:       this._homeDir,
            name:          this._name,
            lastSeen:      this._lastSeen.toISOString(),
        }
    }

    public toDatabase(): any {
        return {
            apiKey:     this._apiKey,
            guid:       this._guid,

            host:       this._host,
            homeDir:    this._homeDir,
            name:       this._name,
            lastSeen:   this._lastSeen,
        }
    }
}

export { WorkspaceInfo };