import { Worker } from "./database/model/worker";
import { Workspace } from "./database/model/workspace";
import { Database } from "./database/database";
import { Settings } from "./settings";
import { Session } from "./database/model/session";

const uuidv4 = require('uuid/v4');

export class JasmineSpecHelpers {
    public existingApiKey: string = "0000-0001";
    public existingUserGuid: string = "00000000-0000-0000-0000-000000000001";
    public existingSessionGuid: string = "00000000-1111-0000-0000-000000000001";
    public notExistingSessionGuid: string = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    public existingWorkspaceGuid: string = "00000000-0000-0000-1111-000000000001";
    public existingWorkerGuid: string = "00000000-cccc-0000-0000-000000000001";

    constructor(private database: Database, private settings: Settings) {
    }

    public rndMac(): string {
        let res = "";
        for (let i=0; i<12; i++) {
            res += Math.round(15 * Math.random()).toString(16);
        }
        return res;
    }

    public rndIp(): string {
        let a1 = 2 + Math.round(252 * Math.random());
        let a2 = 2 + Math.round(252 * Math.random());
        return `192.168.${a1}.${a2}`;
    }

    public rndPort(): number {
        return 10000 + Math.round(50000 * Math.random());
    }

    public async createSomeWorker(mac, ip, port, cpuUsage = undefined) {
        let newWorker = new Worker(null);
        newWorker.guid = uuidv4();
        newWorker.mac = mac;
        newWorker.ip = ip;
        newWorker.port = port;
        newWorker.firstSeen = new Date();
        newWorker.lastSeen = new Date();
        newWorker.workgroup = "default";
        newWorker.cpuUsage = cpuUsage !== undefined ? cpuUsage : Math.random();
        newWorker.ramUsage = Math.random();
        newWorker.totalRam = 32;

        // add fresh worker for the session
        return this.database.insertWorker(newWorker);
    }

    public async touchWorkers(...workers: Worker[]) {
        for(let wi in workers) {
            await this.database.updateOne(
                "workers",
                { guid: workers[wi].guid },
                { $set: { lastSeen: new Date() } });
        }
    }

    public async createSomeWorkspace() {
        let newWorkspace = new Workspace(null);
        newWorkspace.guid = uuidv4();
        newWorkspace.apiKey = this.existingApiKey;
        newWorkspace.workgroup = this.settings.current.workgroup;
        newWorkspace.homeDir = "temp";
        newWorkspace.lastSeen = new Date();
        newWorkspace.name = "Test Workspace";

        // add fresh worker for the session
        return this.database.insertOne<Workspace>("workspaces", newWorkspace, obj => new Workspace(obj));
    }
}

export class JasmineDeplHelpers {
    public static existingApiKey: string = "75f5-4d53-b0f4";
    public static notExistingApiKey: string = "ffff-ffff-ffff";

    public static checkResponse = function(res) {
        expect(res).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
        expect(res.headers['access-control-allow-methods']).toBe('PUT, POST, GET, DELETE, OPTIONS');
        expect(res.data).toBeTruthy();
    }

    public static checkErrorResponse = function(res, expectedStatus) {
        expect(res).toBeTruthy();
        expect(res.status).toBe(expectedStatus);
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
        expect(res.headers['access-control-allow-methods']).toBe('PUT, POST, GET, DELETE, OPTIONS');
        expect(res.data).toBeTruthy();
    }
}