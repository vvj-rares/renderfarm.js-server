import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "../settings";
import { isArray, isNumber } from "util";
import { JasmineDeplHelpers } from "../jasmine.helpers";
import { Session } from "../database/model/session";

const net = require('net');

require("../jasmine.config")();

// IMPORTANT!!! - spec namimg template
// it("should return {what} on {HttpMethod} {path}")
// it("should reject {HttpMethod} on {path} when {what is wrong}")

describe(`Api`, function() {
    var settings: Settings;

    var host: string; // where's DEV is deployed?
    var port: number;
    var baseUrl: string;

    beforeEach(function() {
        host = "dev1.renderfarmjs.com";
        port = 8000;
        baseUrl = `https://${host}:${port}`;

        settings = new Settings("dev");

        settings.current.host = host;
        settings.current.port = port;
        settings.current.publicUrl = baseUrl;

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        axios.defaults.baseURL = baseUrl;
        axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'api_key is missing', 
        error: {} 
    } */
    it("should reject POST on /session when api_key is not provided", async function(done) {
        let data: any = {};
        let config: AxiosRequestConfig = {};

        let res: any;
        try {
            await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            fail();
        } catch (err) {
            res = err.response;
        }

        JasmineDeplHelpers.checkErrorResponse(res, 400, "api_key is missing", null);
        done();
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'api_key is missing', 
        error: {} 
    } */
    it("should reject POST on /session when api_key is invalid", async function(done) {
        let data: any = {
            api_key: JasmineDeplHelpers.notExistingApiKey,
            workspace_guid: JasmineDeplHelpers.notExistingWorkspaceGuid
        };
        let config: AxiosRequestConfig = {};

        let res: any;
        try {
            await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            fail();
        } catch (err) {
            res = err.response;
        }

        JasmineDeplHelpers.checkErrorResponse(res, 403, "api_key rejected");
        done();
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'workspace_guid is missing', 
        error: {} 
    } */
    it("should reject POST on /session when workspace_guid is not provided", async function(done) {
        let data: any = {
            api_key: JasmineDeplHelpers.existingApiKey
        };
        let config: AxiosRequestConfig = {};

        let res: any;
        try {
            await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            fail();
        } catch (err) {
            res = err.response;
        }

        JasmineDeplHelpers.checkErrorResponse(res, 400, "workspace_guid is missing", null);
        done();
    });

    //todo: implement spec
    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'workspace_guid is missing', 
        error: {} 
    } */
    it("should reject POST on /session when workspace_guid is invalid", async function(done) {
        let data: any = {
            api_key: JasmineDeplHelpers.existingApiKey,
            workspace_guid: JasmineDeplHelpers.notExistingWorkspaceGuid
        };
        let config: AxiosRequestConfig = {};

        let res: any;
        try {
            await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            fail();
        } catch (err) {
            res = err.response;
        }

        JasmineDeplHelpers.checkErrorResponse(res, 403, "workspace_guid rejected");
        done();
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* {
        ok: false,
        message: 'workspace_guid does not belong to provided api_key',
        error: {}
    } */
    it("should reject POST on /session when workspace_guid does not belong to provided api_key", async function(done) {
        let data: any = {
            api_key: JasmineDeplHelpers.existingApiKey,
            workspace_guid: JasmineDeplHelpers.existingWorkspaceGuid2
        };
        let config: AxiosRequestConfig = {};

        let res: any;
        try {
            await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            fail();
        } catch (err) {
            res = err.response;
        }

        JasmineDeplHelpers.checkErrorResponse(res, 403, "workspace_guid does not belong to provided api_key", null);
        done();
    })

    async function getOpenSessionAndCheck(apiKey: string, workspaceGuid: string, sessionGuid: string) {
        console.log(`GET open session and check: apiKey=${apiKey}, workspaceGuid=${workspaceGuid}, sessionGuid=${sessionGuid}`);
        let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/session/${sessionGuid}`);
        console.log("Response on GET: ", res.data);

        JasmineDeplHelpers.checkResponse(res, 200);
        let json = res.data;

        expect(json.ok).toBeTruthy();
        expect(json.type).toBe("session");
        expect(json.data.guid).toBe(sessionGuid);
        expect(json.data.apiKey).toBe(apiKey);
        expect(json.data.workspaceGuid).toBe(workspaceGuid);
        expect(json.data.workerGuid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);

        let firstSeen = new Date(json.data.firstSeen);
        let lastSeen = new Date(json.data.lastSeen);
        expect(lastSeen.getTime()).toBeGreaterThanOrEqual(firstSeen.getTime());

        expect(json.data.closed).toBeNull();
        expect(json.data.expired).toBeNull();
    }

    async function getClosedSessionAndCheck(apiKey: string, workspaceGuid: string, sessionGuid: string) {
        console.log(`GET closed session and check: apiKey=${apiKey}, workspaceGuid=${workspaceGuid}, sessionGuid=${sessionGuid}`);
        let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/session/${sessionGuid}`);
        console.log("Response on GET: ", res.data);

        JasmineDeplHelpers.checkResponse(res, 200);
        let json = res.data;

        expect(json.ok).toBeTruthy();
        expect(json.type).toBe("session");
        expect(json.data.guid).toBe(sessionGuid);
        expect(json.data.apiKey).toBe(apiKey);
        expect(json.data.workspaceGuid).toBe(workspaceGuid);
        expect(json.data.workerGuid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);

        let firstSeen = new Date(json.data.firstSeen);
        let lastSeen = new Date(json.data.lastSeen);
        let closedAt = new Date(json.data.closedAt);
        expect(lastSeen.getTime()).toBeGreaterThan(firstSeen.getTime());
        expect(closedAt.getTime()).toBe(lastSeen.getTime());

        expect(json.data.closed).toBeTruthy();
        expect(json.data.expired).toBeNull();
    }

    it("should return session guid on POST /session and be able to GET it back", async function(done) {
        let data: any = {
            api_key: JasmineDeplHelpers.existingApiKey,
            workspace_guid: JasmineDeplHelpers.existingWorkspaceGuid
        };
        let config: AxiosRequestConfig = {};

        let res: any = await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
        console.log("Response on POST: ", res.data);

        JasmineDeplHelpers.checkResponse(res, 201, "session");
        let json = res.data;

        expect(json.data).toBeTruthy();
        expect(json.data.guid).toBeTruthy();
        expect(json.data.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);

        await getOpenSessionAndCheck(
            JasmineDeplHelpers.existingApiKey, 
            JasmineDeplHelpers.existingWorkspaceGuid, 
            json.data.guid);

        done();
    })

    it("should return closed session on DELETE /session and be able to GET it", async function(done) {
        let sessionGuid: string;
        { // open session
            let data: any = {
                api_key: JasmineDeplHelpers.existingApiKey,
                workspace_guid: JasmineDeplHelpers.existingWorkspaceGuid
            };
            let config: AxiosRequestConfig = {};

            let res: any = await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            console.log("Response on POST: ", res.data);

            JasmineDeplHelpers.checkResponse(res, 201);
            let json = res.data;

            expect(json.data).toBeTruthy();
            expect(json.data.guid).toBeTruthy();
            expect(json.data.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);

            sessionGuid = json.data.guid;
        }

        { //now close the session
            let res: any = await axios.delete(`${settings.current.publicUrl}/v${settings.majorVersion}/session/${sessionGuid}`);
            console.log("Response on DELETE: ", res.data);

            JasmineDeplHelpers.checkResponse(res, 200, "session");
            let json = res.data;

            expect(json.data).toBeTruthy();
            expect(json.data.guid).toBeTruthy();
            expect(json.data.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);

            await getClosedSessionAndCheck(
                JasmineDeplHelpers.existingApiKey, 
                JasmineDeplHelpers.existingWorkspaceGuid, 
                json.data.guid);
        }

        done();
    })

    it("should reject POST on /session when there's no available workers", async function (done) {
        let initialWorkerCount: number;
        { // first check how many available workers we have
            let config: AxiosRequestConfig = {};
            config.params = {
                api_key: JasmineDeplHelpers.existingApiKey
            };
            let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            JasmineDeplHelpers.checkResponse(res, 200, "worker");
            let json = res.data;

            initialWorkerCount = json.data.length;
            console.log(`Available workers count: ${initialWorkerCount}`);
            expect(initialWorkerCount).toBeGreaterThan(0);
        }

        let openSessions: Session[] = [];
        for (let k = 0; k <= initialWorkerCount; k++) { // !! one more time that collection length

            // now create one session after another until we grab all workers
            console.log(`Creating session ${k + 1} of ${initialWorkerCount}`);
            let data: any = {
                api_key: JasmineDeplHelpers.existingApiKey,
                workspace_guid: JasmineDeplHelpers.existingWorkspaceGuid
            };
            let config: AxiosRequestConfig = {};

            let res: any
            try {
                res = await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            } catch (err) {
                // this is not ok, because we expected more workers to be available
                JasmineDeplHelpers.checkErrorResponse(err.response, 500, "failed to create session", "all workers busy");
                console.log(err.message);
                fail();
                break;
            }

            JasmineDeplHelpers.checkResponse(res, 201, "session");
            let json = res.data;
            openSessions.push(json.data.guid);
        }

        let workerCount: number;
        { // now check how many available workers left (must be zero)
            let config: AxiosRequestConfig = {};
            config.params = {
                api_key: JasmineDeplHelpers.existingApiKey
            };
            let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            JasmineDeplHelpers.checkResponse(res, 200, "worker");
            let json = res.data;

            workerCount = json.data.length;
            console.log(`Available workers count: ${workerCount}`);
            expect(workerCount).toBe(0);
        }

        { // now close sessions that we opened
            for (let si in openSessions) {
                let sessionGuid = openSessions[si];
                let res: any = await axios.delete(`${settings.current.publicUrl}/v${settings.majorVersion}/session/${sessionGuid}`);

                JasmineDeplHelpers.checkResponse(res, 200, "session");
            }
        }

        { // and how many workers we have now?
            let config: AxiosRequestConfig = {};
            config.params = {
                api_key: JasmineDeplHelpers.existingApiKey
            };
            let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            JasmineDeplHelpers.checkResponse(res, 200, "worker");
            let json = res.data;

            workerCount = json.data.length;
            console.log(`Available workers count: ${workerCount}`);
            expect(workerCount).toBe(initialWorkerCount);
        }

        done();
    });

    /* fit("should reject POST on /session when there's no available workers", async function (done) {
        let initialWorkerCount: number;
        { // first check how many available workers we have
            let config: AxiosRequestConfig = {};
            config.params = {
                api_key: JasmineDeplHelpers.existingApiKey
            };
            let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            JasmineDeplHelpers.checkResponse(res, 200, "worker");
            let json = res.data;

            initialWorkerCount = json.data.length;
            console.log(`Available workers count: ${initialWorkerCount}`);
            expect(initialWorkerCount).toBeGreaterThan(0);
        }

        let openSessions: Session[] = [];
        for (let k = 0; k < initialWorkerCount; k++) { // !! one more time that collection length

            // now create one session after another until we grab all workers
            console.log(`Creating session ${k + 1} of ${initialWorkerCount}`);
            let data: any = {
                api_key: JasmineDeplHelpers.existingApiKey,
                workspace_guid: JasmineDeplHelpers.existingWorkspaceGuid
            };
            let config: AxiosRequestConfig = {};

            let res: any
            try {
                res = await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
            } catch (err) {
                // this is not ok, because we expected more workers to be available
                JasmineDeplHelpers.checkErrorResponse(err.response, 500, "failed to create session", "all workers busy");
                console.log(err.message);
                fail();
                break;
            }

            let url2 = `${settings.current.publicUrl}/v${settings.majorVersion}/session/${res.data.data.guid}`;
            console.log(` >>>> GET ${url2}`);
            let res2 = await axios.get(url2);
            console.log(" >>>> session=", res2.data);
            console.log(" >>>> workerGuid=", res2.data.data.workerGuid);
            let workerGuid = res2.data.data.workerGuid;

            let url3 = `${settings.current.publicUrl}/v${settings.majorVersion}/worker/${workerGuid}`;
            console.log(` >>>> GET ${url3}`);
            let res3 = await axios.get(url3);
            console.log(" >>>> worker=", res3.data);
            console.log(" >>>> port=", res3.data.data.port);
            let workerPort = res3.data.data.port;

            // send some commands directly on fake worker
            // var client = new net.Socket();
            // console.log(`Connecting`)
            // client.connect(workerPort, host, function() {
            //     console.log('Connected');
            //     client.write('Hello, server! Love, Client.');
            // });
            
            // client.on('error', function(err) {
            //     console.log('Error: ' + err);
            //     client.destroy(); // kill client after server's response
            // });

            // client.on('data', function(data) {
            //     console.log('Received: ' + data);
            //     client.destroy(); // kill client after server's response
            // });
            
            // client.on('close', function() {
            //     console.log('Connection closed');
            // });

            JasmineDeplHelpers.checkResponse(res, 201, "session");
            let json = res.data;
            openSessions.push(json.data.guid);
        }

        let workerCount: number;
        { // now check how many available workers left (must be zero)
            let config: AxiosRequestConfig = {};
            config.params = {
                api_key: JasmineDeplHelpers.existingApiKey
            };
            let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            JasmineDeplHelpers.checkResponse(res, 200, "worker");
            let json = res.data;

            workerCount = json.data.length;
            console.log(`Available workers count: ${workerCount}`);
            expect(workerCount).toBe(0);
        }

        { // now close sessions that we opened
            for (let si in openSessions) {
                let sessionGuid = openSessions[si];
                let res: any = await axios.delete(`${settings.current.publicUrl}/v${settings.majorVersion}/session/${sessionGuid}`);

                JasmineDeplHelpers.checkResponse(res, 200, "session");
            }
        }

        { // and how many workers we have now?
            let config: AxiosRequestConfig = {};
            config.params = {
                api_key: JasmineDeplHelpers.existingApiKey
            };
            let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            JasmineDeplHelpers.checkResponse(res, 200, "worker");
            let json = res.data;

            workerCount = json.data.length;
            console.log(`Available workers count: ${workerCount}`);
            expect(workerCount).toBe(initialWorkerCount);
        }

        done();
    }); */
});
