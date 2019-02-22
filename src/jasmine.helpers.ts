import { Worker } from "./database/model/worker";
import { Workspace } from "./database/model/workspace";
import { Database } from "./database/database";
import { Settings } from "./settings";
import axios, { AxiosRequestConfig } from "axios";
import { ISettings } from "./interfaces";

const uuidv4 = require('uuid/v4');

export class JasmineSpecHelpers {
    public existingApiKey: string = "0000-0001";
    public existingUserGuid: string = "00000000-0000-0000-0000-000000000001";
    public existingSessionGuid: string = "00000000-1111-0000-0000-000000000001";
    public notExistingSessionGuid: string = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    public existingWorkspaceGuid: string = "00000000-0000-0000-1111-000000000001";
    public existingWorkerGuid: string = "00000000-cccc-0000-0000-000000000001";
    public existingJobGuid: string = "00000000-396c-434d-b876-000000000001";

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
    public static existingApiKey:  string = "75f5-4d53-b0f4";
    public static existingApiKey2: string = "f39b-41cd-9315";
    public static notExistingApiKey: string = "ffff-ffff-ffff";

    public static existingWorkspaceGuid: string    = "cfc3754f-0bf1-4b15-86a5-66e1d077c850";
    public static otherWorkspaceGuid: string       = "94ea71ec-9560-482a-95b8-31a7af5e46dc";
    public static notExistingWorkspaceGuid: string = "ffffffff-ffff-ffff-ffff-fffffffffffe";

    public static existingWorkspaceGuid2: string   = "886215aa-9082-4278-bb60-57328fce632b";
    public static otherWorkspaceGuid2: string      = "7331b172-c31c-4a06-975f-b44c648e55f7";

    public static checkResponse = function(res: any, expectedStatusCode: number, expectedType?: string) {
        expect(res).toBeTruthy();
        expect(res.status).toBe(expectedStatusCode);

        //check returned headers
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
        expect(res.headers['access-control-allow-methods']).toBe('PUT, POST, GET, DELETE, OPTIONS');

        //check returned payload
        console.log("Checking response: ", res.data);
        expect(res.data).toBeTruthy();
        expect(res.data.ok).toBe(true);

        if (expectedType !== undefined) {
            expect(res.data.type).toBe(expectedType);
        }
    }

    public static checkErrorResponse = function(res: any, expectedStatus: number, expectedMessage?: string, expectedError?: string) {
        expect(res).toBeTruthy();
        expect(res.status).toBe(expectedStatus);

        //check returned headers
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
        expect(res.headers['access-control-allow-methods']).toBe('PUT, POST, GET, DELETE, OPTIONS');

        //check returned payload
        console.log("Checking error response: ", res.data);
        expect(res.data).toBeTruthy();
        expect(res.data.ok).toBe(false);

        if (expectedMessage !== undefined) {
            expect(res.data.message).toBe(expectedMessage);
        }

        if (expectedError !== undefined) {
            expect(res.data.error).toBe(expectedError);
        }
    }

    public static async openSession(apiKey: string, workspaceGuid: string, maxSceneFilename: string, settings: ISettings, fail: Function, done: Function): Promise<string> {
        console.log(`Opening session apiKey: ${apiKey}, workspaceGuid: ${workspaceGuid}, maxSceneFilename: ${maxSceneFilename}`);

        let data: any = {
            api_key: apiKey,
            workspace_guid: workspaceGuid,
            scene_filename: maxSceneFilename
        };
        let config: AxiosRequestConfig = {};
        let res: any
        try {
            res = await axios.post(`${settings.current.protocol}://${settings.current.host}:${settings.current.port}/v${settings.majorVersion}/session`, data, config);
            console.log(res);
        } catch (exc) {
            // this is not ok, because we expected more workers to be available
            console.log(exc.error);
            console.log(exc.message);

            fail();
            done();
            return;
        }

        JasmineDeplHelpers.checkResponse(res, 201, "session");

        let json = res.data;
        let sessionGuid = json.data.guid;

        return sessionGuid;
    }

    public static async closeSession(guid: string, settings: ISettings) {
        console.log(`Closing session ${guid}`);

        let res: any = await axios.delete(`${settings.current.protocol}://${settings.current.host}:${settings.current.port}/v${settings.majorVersion}/session/${guid}`);
        JasmineDeplHelpers.checkResponse(res, 200, "session");
    }
}