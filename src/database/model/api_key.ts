export class ApiKey {
    public apiKey: string;
    public userGuid: string;
    public lastSeen: Date;

    constructor(obj: any) {
        this.apiKey = obj.apiKey;
        this.userGuid = obj.userGuid;
        this.lastSeen = new Date(obj.lastSeen);
    }
}
