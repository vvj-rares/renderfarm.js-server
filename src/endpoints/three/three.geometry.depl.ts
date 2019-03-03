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

    //request:  POST on https://dev1.renderfarmjs.com:8000/v1/three
    //response: TODO
    it("should accept array of geometries POST on /three/geometry and return single geometry by uuid", async function(done) {

        let sceneJsonText = fs.readFileSync("./test_data/scene1.json").toString();
        let sceneJson = JSON.parse(sceneJsonText);

        let geometries = sceneJson.geometries;

        delete sceneJson.geometries;
        delete sceneJson.materials;

        let compressedGeometries = LZString.compressToBase64(JSON.stringify(geometries));

        let sessionGuid = await JasmineDeplHelpers.openSession(
            JasmineDeplHelpers.existingApiKey,
            JasmineDeplHelpers.existingWorkspaceGuid,
            null, // maxSceneFilename = null, i.e. just create empty scene
            settings,
            fail,
            done);

        console.log("OK | opened session with sessionGuid: ", sessionGuid, "\r\n");

        let res: any;
        let config: AxiosRequestConfig = {};

        { // post threejs geometries
            let data: any = {
                session_guid: sessionGuid,
                compressed_json: compressedGeometries,
            };
            let config: AxiosRequestConfig = {};

            try {
                let postUrl = `${settings.current.protocol}://${settings.current.host}:${settings.current.port}/v${settings.majorVersion}/three/geometry`;
                res = await axios.post(postUrl, data, config);
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
        }

        let geometryUrls = res.data.data;
        console.log("geometryUrls: ", geometryUrls);

        { // now try to get it back
            let getUrl = geometryUrls[0];
            try {
                res = await axios.get(getUrl, config);
            } catch (exc) {
                console.log(exc);

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

            let parsedGeometry = res.data;
            console.log(parsedGeometry);
            // expect(parsedScene.object.uuid).toBe("EA03FB20-B8C7-4925-80FF-51E71F29C20B");

            await JasmineDeplHelpers.closeSession(sessionGuid, settings);
            console.log("OK | closed session with sessionGuid: ", sessionGuid, "\r\n");

            // todo: try to get scene again and see if it was removed on session close
            try {
                res = await axios.get(getUrl, config);
                console.log("Second GET request on /three should result in 404 error, because session was closed");
                console.log(" >> GET returned: ", res);
                fail();
            } catch(exc) {
                expect(exc.response.status).toBe(404);
                expect(exc.response.data.message).toBe("geometry cache not found");
            }
        }

        done();
    });
});
