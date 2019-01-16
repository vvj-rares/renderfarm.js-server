import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "./settings";
import { isArray, isNumber } from "util";
import { JasmineDeplHelpers } from "./jasmine.helpers";

require("./jasmine.config")();

// IMPORTANT!!! - spec namimg template
// it("should return {what} on {HttpMethod} {path}")
// it("should reject {HttpMethod} {path} when {what is wrong}")

describe(`Api`, function() {
    var settings: Settings;

    beforeEach(function() {
        const host = "dev1.renderfarmjs.com";
        const port = 8000;
        const baseUrl = `https://${host}:${port}`;

        settings = new Settings("dev");

        settings.current.host = host;
        settings.current.port = port;
        settings.current.publicUrl = baseUrl;

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        axios.defaults.baseURL = baseUrl;
        axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    });

    //request:  /GET https://dev1.renderfarmjs.com:8000/
    //response: {"env":"dev","version":"1.0.0.57"}
    it("should return own version on GET / request", async function(done) {
        let res: any = await axios.get(settings.current.publicUrl);
        JasmineDeplHelpers.checkResponse(res, 200, "version");

        let json = res.data;

        expect(json.data.env).toBe(settings.env);
        expect(json.data.version).toBe(settings.version);

        done();
    });

    //request:  /GET https://dev1.renderfarmjs.com:8000/v1/worker/?api_key=75f5-4d53-b0f4
    /* response: 
    {
        "ok": true,
        "type": "worker",
        "data": [
            {
            "guid": "32cd3e58-5ac7-4ad9-9db4-5a79b2d0c0b9",
            "mac": "00000000000000",
            "ip": "127.0.0.1",
            "port": 53334,
            "endpoint": "127.0.0.1:53334",
            "workgroup": "default",
            "firstSeen": "2019-01-14T19:47:02.925Z",
            "lastSeen": "2019-01-15T06:17:02.861Z",
            "cpuUsage": 0.06411851693063886,
            "ramUsage": 0.10791498673546315,
            "totalRam": 32,
            "sessionGuid": null
            }
        ]
    } */
    it("should return at least one available worker on GET /worker", async function() {
        let config: AxiosRequestConfig = {};
        config.params = {
            api_key: JasmineDeplHelpers.existingApiKey
        };
        let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
        JasmineDeplHelpers.checkResponse(res, 200);
        let json = res.data;

        expect(json.ok).toBeTruthy();
        expect(json.type).toBe("worker");
        expect(isArray(json.data)).toBeTruthy();
        expect(json.data.length).toBeGreaterThan(0);

        let worker = json.data[0];
        expect(worker.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);
        expect(worker.mac).toMatch(/\w{12}/);
        expect(worker.ip).toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
        expect(isNumber(worker.port)).toBeTruthy();
        expect(worker.endpoint).toBe(`${worker.ip}:${worker.port}`);

        expect(worker.workgroup).toBe("default");

        expect(worker.firstSeen).toBeTruthy();
        expect(worker.lastSeen).toBeTruthy();

        let firstSeen = Date.parse(worker.firstSeen);
        let lastSeen  = Date.parse(worker.lastSeen);

        expect(lastSeen).toBeGreaterThanOrEqual(firstSeen);

        expect(isNumber(worker.cpuUsage)).toBeTruthy();
        expect(isNumber(worker.ramUsage)).toBeTruthy();
        expect(isNumber(worker.totalRam)).toBeTruthy();

        expect(worker.sessionGuid).toBeNull();
    });

    //request:  /GET https://dev1.renderfarmjs.com:8000/v1/worker
    /* response: 
    {
        "ok": false,
        "message": "api_key is missing",
        "error": {}
    } */
    it("should reject GET /worker when no api_key is provided", async function() {
        let config: AxiosRequestConfig = {};
        config.params = {
            // api_key: undefined
        };

        let res: any;
        try {
            await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            fail();
        } catch (err) {
            res = err.response;
        }

        JasmineDeplHelpers.checkErrorResponse(res, 400);
        let json = res.data;

        expect(json.ok).toBeFalsy();
        expect(json.message).toBeTruthy();
        expect(json.message).toBe("api_key is missing");
        expect(json.error).toBeTruthy();
    })

    //request:  /GET https://dev1.renderfarmjs.com:8000/v1/worker/?api_key=ffff-ffff-ffff
    /* response: 
    {
        "ok": false,
        "message": "api_key rejected",
        "error": {}
    } */
    it("should reject /GET worker when invalid api_key is provided", async function() {
        let config: AxiosRequestConfig = {};
        config.params = {
            api_key: JasmineDeplHelpers.notExistingApiKey
        };

        let res: any;
        try {
            await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
            fail();
        } catch (err) {
            res = err.response;
        }

        JasmineDeplHelpers.checkErrorResponse(res, 403);
        let json = res.data;

        expect(json.ok).toBeFalsy();
        expect(json.message).toBeTruthy();
        expect(json.message).toBe("api_key rejected");
        expect(json.error).toBeTruthy();
    })
});
