import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "../../settings";
import { JasmineDeplHelpers } from "../../jasmine.helpers";

const fs = require("fs");
const LZString = require("lz-string");

require("../../jasmine.config")();

// IMPORTANT!!! - spec namimg template
// it("should return {what} on {HttpMethod} {path}")
// it("should reject {HttpMethod} on {path} when {what is wrong}")

describe(`REST API /three/geometry endpoint`, function() {
    var settings: Settings;

    var baseUrl: string;

    beforeEach(function() {
        settings = new Settings("dev");
        baseUrl = `${settings.current.protocol}://${settings.current.host}:${settings.current.port}`;

        console.log("baseUrl: ", baseUrl);

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        axios.defaults.baseURL = baseUrl;
        axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    afterEach(function() {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
    })

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/three/object
    //response: TODO
    it("should accept POST on /three with some scene", async function(done) {

        let sceneJsonText = fs.readFileSync("./testdata/scene1.json").toString();
        let compressedJson = LZString.compressToBase64(sceneJsonText);

        let sessionGuid = await JasmineDeplHelpers.openSession(
            JasmineDeplHelpers.existingApiKey,
            JasmineDeplHelpers.existingWorkspaceGuid,
            null, // maxSceneFilename = null, i.e. just create empty scene
            settings,
            fail,
            done);

        console.log("OK | opened session with sessionGuid: ", sessionGuid, "\r\n");

        let data: any = {
            session_guid: sessionGuid,
            compressed_json: compressedJson,
        };
        let config: AxiosRequestConfig = {};

        let res: any;
        try {
            res = await axios.post(`${settings.current.protocol}://${settings.current.host}:${settings.current.port}/v${settings.majorVersion}/three`, data, config);
        } catch (exc) {
            console.log(exc.error);
            console.log(exc.message);

            // try to be nice and release worker
            try {
                await JasmineDeplHelpers.closeSession(sessionGuid, settings);
                console.log("OK | closed session with sessionGuid: ", sessionGuid, "\r\n");
            } catch {
                // ignore
            }

            fail();
            return;
        }

        JasmineDeplHelpers.checkResponse(res, 201, "url");

        await JasmineDeplHelpers.closeSession(sessionGuid, settings);
        console.log("OK | closed session with sessionGuid: ", sessionGuid, "\r\n");

        done();
    });
});
