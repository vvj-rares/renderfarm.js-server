import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "../settings";
import { JasmineDeplHelpers } from "../jasmine.helpers";

const fs = require('fs');
const path = require('path');
const https = require('https');
const formData = require('form-data');
const tmp = require('tmp');

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

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/renderoutput
    //response: StatusCode=201
    it("should todo: define", async function(done) {
        let config: AxiosRequestConfig = {};
        let form = new formData();

        let tmpUpload = tmp.fileSync();
        let filename = path.basename(tmpUpload.name);
        console.log("tmpUpload: ", tmpUpload.name);

        let uploadedFileContents = `${(new Date()).toISOString()} - Hello renderoutput! (${Math.random()})`
        console.log("uploadedFileContents: ", uploadedFileContents);

        fs.writeFileSync(tmpUpload.name, uploadedFileContents);
          
        form.append('file', fs.createReadStream(tmpUpload.name), {
            filename: filename
        });

        let res;
        let prevHeaders = axios.defaults.headers;
        try {
            axios.defaults.headers = form.getHeaders();
            res = await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/renderoutput`, form, config);
        } catch {
            // don't harm other tests that will run after
            axios.defaults.headers = prevHeaders;
        }

        JasmineDeplHelpers.checkResponse(res, 201);
        let json = res.data;

        expect(json.ok).toBeTruthy();
        expect(json.type).toBe("renderoutput");
        expect(json.data.url).toMatch(/https:\/\/.*?\/renderoutput\/.*?\.tmp/);

        let tmpDownload = tmp.fileSync();
        let file = fs.createWriteStream(tmpDownload.name);

        let request = https.get(json.data.url, function(response) {
            response.pipe(file);
            
            setTimeout(function() {
                let downloadedFileContents = fs.readFileSync(tmpDownload.name, 'utf8');

                console.log("tmpDownload: ", tmpDownload.name);
                console.log("downloadedFileContents: ", downloadedFileContents);

                expect(downloadedFileContents).toBe(uploadedFileContents);

                tmpUpload.removeCallback();
                tmpDownload.removeCallback();

                done();
            }, 50);
        });

        expect(request).toBeTruthy();
        // not done, wait for get response
    });
});
