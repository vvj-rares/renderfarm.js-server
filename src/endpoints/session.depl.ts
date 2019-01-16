import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "../settings";
import { isArray, isNumber } from "util";
import { JasmineDeplHelpers } from "../jasmine.helpers";
import { Session } from "../database/model/session";
import { setServers } from "dns";

const uuidv4 = require('uuid/v4');
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

        let openSessions: string[] = [];
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

    // find out current DEV version
    async function getEnvVersion(fail, done) {
        let currentVersion: string;

        let res: any;
        try {
            res = await axios.get(settings.current.publicUrl);
        } catch (err) {
            console.log(err);
            fail();
            done();
            return;
        }

        JasmineDeplHelpers.checkResponse(res, 200, "version");

        let json = res.data;

        expect(json.data.env).toBe(settings.env);
        expect(json.data.version).toMatch(/\d+\.\d+\.\d+\.\d+/);

        currentVersion = json.data.version;
        console.log(`currentVersion: ${currentVersion}`);

        return currentVersion;
    }

    const wwwBaseDir = "/home/rfarm-api/www/html";
    function getWorkerLogDownloadUrl(version: string, testName: string, testRun: number, workerPort: number): string {
        return `http://${host}/logs/${version}.renderfarm.js-server/out.worker-fake.name=${testName}.port=${workerPort}.${testRun}.log`;
    }

    function getWorkerLogFullpath(version: string, testName: string, testRun: number, workerPort: number): string {
        return `${wwwBaseDir}/logs/${version}.renderfarm.js-server/out.worker-fake.name=${testName}.port=${workerPort}.${testRun}.log`;
    }

    function setWorkerLogFile(version: string, testName: string, testRun: number, workerPort: number) {
        return new Promise<any>(function(resolve, reject) {
            // send commands directly to fake worker
            let client = new net.Socket();

            console.log(`Connecting to fake worker ${host}:${workerPort} ...`);
            client.connect(workerPort, host, function() {
                console.log(`    Connected`);

                let workerConfig: any;
                if (testName) {
                    workerConfig = { worker: { 
                        testRun: 0,
                        testName: testName,
                        logFile: getWorkerLogFullpath(version, testName, testRun, workerPort) } };
                } else {
                    // when test name is not defined, worker should stop writing to logfile
                    workerConfig = { worker: { logFile: null } };
                }

                console.log(`    Sending fake worker config: `, workerConfig);
                client.write(JSON.stringify(workerConfig));
            });

            client.on('error', function(err) {
                console.error('    Fake worker connection error: ' + err);
                client.destroy(); // kill client after server's response
                reject(err);
            });

            client.on('data', function(data) {
                let json = JSON.parse(data.toString());
                if (json.result) {
                    console.log(`    Fake worker configured successfully`);
                } else {
                    console.warn(`    Unexpected fake worker response: `, data);
                }
                client.destroy(); // kill client after server's response
                resolve(data);
            });
            
            client.on('close', async function() {
                // do nothing
            });
        });
    }

    // this helper configures workers to write communication logs to some predictable place
    // where the logs can be found and downloaded
    async function setWorkersLogFile(version: string, testName: string, testRun: number, fail: Function, done: Function) {
        console.log("Configuring available fake workers with parameters: ", `version= \"${version}\", testName= \"${testName}\", testRun= \"${testRun}\"`);

        { // first configure all available workers to write logfiles
            let config: AxiosRequestConfig = {};
            config.params = {
                api_key: JasmineDeplHelpers.existingApiKey
            };
            let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            JasmineDeplHelpers.checkResponse(res, 200, "worker");

            let json = res.data;

            let availableWorkerCount = json.data.length;
            console.log(`Available workers count: ${availableWorkerCount}`);

            expect(availableWorkerCount).toBeGreaterThan(0);

            if (availableWorkerCount === 0) { // no reason to proceed with this test, as we need at least one worker
                fail();
                done();
                return;
            }

            let availableWorkers = json.data;
            for (let k in availableWorkers) {
                try {
                    await setWorkerLogFile(version, testName, testRun, availableWorkers[k].port);
                } catch (err) {
                    console.log("failed to set worker log file, ", err);
                    fail();
                    done();
                    return;
                }
            }
        }
    }

    async function openSession(fail, done): Promise<string> {
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
            done();
            return;
        }

        JasmineDeplHelpers.checkResponse(res, 201, "session");

        let json = res.data;
        let sessionGuid = json.data.guid;

        return sessionGuid;
    }

    // helper to close sessions
    async function closeSession(guid) {
        console.log(`Closing session ${guid}`);
        let res: any = await axios.delete(`${settings.current.publicUrl}/v${settings.majorVersion}/session/${guid}`);
        JasmineDeplHelpers.checkResponse(res, 200, "session");
    }

    fit("should send correct maxscript commands to worker on POST /session", async function (done) {
        let currentVersion = await getEnvVersion(fail, done);
        let testName = "POST_session";
        let testRun = Date.now();

        await setWorkersLogFile(currentVersion, testName, testRun, fail, done);

        let sessionGuid = await openSession(fail, done);

        let workerGuid: string;
        let workerPort: number;
        { // retrieve worker that was assigned to the session

            // 1. get session details to know worker guid
            let getSessionUrl = `${settings.current.publicUrl}/v${settings.majorVersion}/session/${sessionGuid}`;
            console.log(`GET on ${getSessionUrl}`);
            let getSessionResponse = await axios.get(getSessionUrl);

            console.log("session: ",    getSessionResponse.data);
            console.log("workerGuid: ", getSessionResponse.data.data.workerGuid);

            workerGuid = getSessionResponse.data.data.workerGuid;

            // 2. now get worker
            let getWorkerUrl = `${settings.current.publicUrl}/v${settings.majorVersion}/worker/${workerGuid}`;
            console.log(`GET on ${getWorkerUrl}`);
            let getWorkerResponse = await axios.get(getWorkerUrl);

            console.log("worker: ", getWorkerResponse.data);
            console.log("port: ",   getWorkerResponse.data.data.port);

            workerPort = getWorkerResponse.data.data.port;
        }

        // we're done, can close session
        await closeSession(sessionGuid);

        // tell worker to stop writing logs
        await setWorkersLogFile(null, null, null, fail, done);

        { // Now analyze fake worker log file
            let logGetConfig: AxiosRequestConfig = {
                auth: {
                    username: settings.current.dropFolderUsername,
                    password: settings.current.dropFolderPassword
                }
            };

            let logUrl = getWorkerLogDownloadUrl(currentVersion, testName, testRun, workerPort);
            console.log(`Getting fake worker log file: ${logUrl}`);
            let res4: any = await axios.get(logUrl, logGetConfig);

            console.log(res4.data);

            done();
        }

        //hey, not done() here, see how socket works
    });
});
