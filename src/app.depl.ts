import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "./settings";
import { JasmineHelpers } from "./jasmine.helpers";
import { isArray, isNumber } from "util";

require("./jasmine.config")();

describe(`Api`, function() {
    var settings: Settings;

    var checkResponse = function(res) {
        expect(res).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('*');
        expect(res.headers['access-control-allow-headers']).toBe('Origin, X-Requested-With, Content-Type, Accept');
        expect(res.headers['access-control-allow-methods']).toBe('PUT, POST, GET, DELETE, OPTIONS');
    };

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

    it("should return own version on simple GET request", async function() {
        let res: any = await axios.get(settings.current.publicUrl);
        checkResponse(res);
        expect(res.data).toBeTruthy();
        expect(res.data.version).toBe(settings.version);
    });

    it("should return at least one available worker", async function() {
        let config: AxiosRequestConfig = {};
        config.params = {
            api_key: "75f5-4d53-b0f4"
        };
        let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/worker`, config);
        checkResponse(res);
        expect(res.data).toBeTruthy();
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
});