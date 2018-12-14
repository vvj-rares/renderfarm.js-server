class WorkspaceInfo {
    private _apiKey: string;
    private _guid: string;
    private _homeDir: string;
    private _renderOutputDir: string;
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

    public get homeDir(): string {
        return this._homeDir;
    }

    public get renderOutputDir(): string {
        return this._renderOutputDir;
    }

    public get name(): string {
        return this._name;
    }

    public get lastSeen(): Date {
        return this._lastSeen;
    }

    public static fromJSON(obj: any): WorkspaceInfo {
        let res = new WorkspaceInfo(obj.apiKey, obj.guid);

        res._homeDir  = obj.homeDir;
        res._renderOutputDir = obj.renderOutputDir;
        res._name  = obj.name;
        res._lastSeen  = new Date(obj.lastSeen);

        return res;
    }

    public toJSON(): any {
        return {
            apiKey:        this._apiKey,
            guid:          this._guid,

            homeDir:       this._homeDir,
            renderOutputDir: this._renderOutputDir,
            name:          this._name,
            lastSeen:      this._lastSeen.toISOString(),
        }
    }

    public toDatabase(): any {
        return {
            apiKey:     this._apiKey,
            guid:       this._guid,

            homeDir:    this._homeDir,
            renderOutputDir: this._renderOutputDir,
            name:       this._name,
            lastSeen:   this._lastSeen,
        }
    }
}

export { WorkspaceInfo };