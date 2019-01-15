import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "../settings";
import { isArray, isNumber } from "util";
import { JasmineDeplHelpers } from "../jasmine.helpers";

require("../jasmine.config")();

// IMPORTANT!!! - spec namimg template
// it("should return {what} on {HttpMethod} {path}")
// it("should reject {HttpMethod} on {path} when {what is wrong}")

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

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'api_key is missing', 
        error: {} 
    } */
    it("should reject POST on /session when api_key is not provided", async function() {
        let data: any = {};
        let config: AxiosRequestConfig = {};

        let res: any;
        try {
            await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);
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
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'api_key is missing', 
        error: {} 
    } */
    it("should reject POST on /session when api_key is invalid", async function() {
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

        JasmineDeplHelpers.checkErrorResponse(res, 403);
        let json = res.data;

        expect(json.ok).toBeFalsy();
        expect(json.message).toBeTruthy();
        expect(json.message).toBe("api_key rejected");
        expect(json.error).toBeTruthy();
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'workspace_guid is missing', 
        error: {} 
    } */
    it("should reject POST on /session when workspace_guid is not provided", async function() {
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

        JasmineDeplHelpers.checkErrorResponse(res, 400);
        let json = res.data;
        expect(json.ok).toBeFalsy();
        expect(json.message).toBeTruthy();
        expect(json.message).toBe("workspace_guid is missing");
        expect(json.error).toBeTruthy();
    });

    //todo: implement spec
    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* { 
        ok: false, 
        message: 'workspace_guid is missing', 
        error: {} 
    } */
    it("should reject POST on /session when workspace_guid is invalid", async function() {
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

        JasmineDeplHelpers.checkErrorResponse(res, 403);
        let json = res.data;
        expect(json.ok).toBeFalsy();
        expect(json.message).toBeTruthy();
        expect(json.message).toBe("workspace_guid rejected");
        expect(json.error).toBeTruthy();
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/session
    //response: StatusCode=400
    /* {
        ok: false,
        message: 'workspace_guid does not belong to provided api_key',
        error: {}
    } */
    it("should reject POST on /session when workspace_guid does not belong to provided api_key", async function() {
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

        JasmineDeplHelpers.checkErrorResponse(res, 403);
        let json = res.data;
        expect(json.ok).toBeFalsy();
        expect(json.message).toBeTruthy();
        expect(json.message).toBe("workspace_guid does not belong to provided api_key");
        expect(json.error).toBeTruthy();
    })

    async function getSessionAndCheck(sessionGuid: string) {
        let res: any = await axios.get(`${settings.current.publicUrl}/v${settings.majorVersion}/session/${sessionGuid}`);

        JasmineDeplHelpers.checkResponse(res);
        let json = res.data;

        console.log(json);

        expect(json.ok).toBeTruthy();
        expect(json.type).toBe("session");
    }

    it("should return session guid on POST /session and be able to GET it back", async function() {
        let data: any = {
            api_key: JasmineDeplHelpers.existingApiKey,
            workspace_guid: JasmineDeplHelpers.existingWorkspaceGuid
        };
        let config: AxiosRequestConfig = {};

        let res: any = await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/session`, data, config);

        JasmineDeplHelpers.checkResponse(res);
        let json = res.data;
        console.log(json);
        expect(json.ok).toBeTruthy();
        expect(json.type).toBe("session");
        expect(json.data).toBeTruthy();
        expect(json.data.guid).toBeTruthy();
        expect(json.data.guid).toMatch(/\w{8}\-\w{4}\-\w{4}\-\w{4}\-\w{12}/);

        getSessionAndCheck(json.data.guid);

        //todo: add more checks
    })
});
