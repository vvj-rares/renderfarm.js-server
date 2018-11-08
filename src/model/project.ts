import uuidv4 = require('uuid/v4');

class Project {
    private _guid: string;
    private _createdAt: Date;
    private _lastSeen: Date;
    private _name: string;

    constructor(name: string) {
        this._createdAt = new Date();
        this._lastSeen = new Date();
        this._guid = uuidv4();
        this._name = name || "Project";
    }

    public get guid(): string {
        return this._guid;
    }

    public get createdAt(): Date {
        return this._createdAt;
    }

    public get lastSeen(): Date {
        return this._lastSeen;
    }

    public get name(): string {
        return this._name;
    }

    public touch(): void {
        this._lastSeen = new Date();
    }

    public static fromJSON(obj: any): Project {
        let res = new Project(obj.name || "Project");

        res._guid      = obj.guid;
        res._createdAt = new Date(obj.createdAt);
        res._lastSeen  = new Date(obj.lastSeen);

        return res;
    }

    public fromJSON(obj: any): void {
        if (obj.name !== undefined) {
            this._name = obj.name;
            this.touch();
        }
    }

    public toJSON(apiKey: string): any {
        return {
            apiKey: apiKey != "" ? apiKey : undefined,
            guid:   this._guid,
            createdAt: this._createdAt.toISOString(),
            lastSeen:  this._lastSeen.toISOString(),
            name: this._name
        }
    }
}

export { Project };