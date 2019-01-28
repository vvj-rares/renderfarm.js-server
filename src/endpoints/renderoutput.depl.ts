import "reflect-metadata";
import axios, { AxiosRequestConfig } from "axios";
import { Settings } from "../settings";
import { JasmineDeplHelpers } from "../jasmine.helpers";
import { isArray } from "util";

const fs = require('fs');
const path = require('path');
const https = require('https');
const formData = require('form-data');
const tmp = require('tmp');

require("../jasmine.config")();

// IMPORTANT!!! - spec namimg template
// it("should return {what} on {HttpMethod} {path}")
// it("should reject {HttpMethod} on {path} when {what is wrong}")

describe(`REST API /renderoutput endpoint`, function() {
    var settings: Settings;

    var baseUrl: string;

    beforeEach(function() {
        settings = new Settings("dev");
        baseUrl = `https://${settings.current.host}:${settings.current.port}`;

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        axios.defaults.baseURL = baseUrl;
        axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    });

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/renderoutput
    //response: StatusCode=201
    it("should return file URL on POST /renderoutput and let download file on this URL", async function(done) {
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
        } finally {
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

    //request:  /POST https://dev1.renderfarmjs.com:8000/v1/renderoutput
    //response: StatusCode=201
    it("should return array of file URLs on POST /renderoutput with multiple files, and let download file on this URL", async function(done) {
        let config: AxiosRequestConfig = {};
        let form = new formData();

        let tmpUpload0 = tmp.fileSync();
        let tmpUpload1 = tmp.fileSync();

        let filename0 = path.basename(tmpUpload0.name);
        let filename1 = path.basename(tmpUpload1.name);

        console.log("tmpUpload0: ", tmpUpload0.name);
        console.log("tmpUpload1: ", tmpUpload1.name);

        let uploadedFileContents0 = `${(new Date()).toISOString()} - Hello 1 renderoutput! (${Math.random()})`
        let uploadedFileContents1 = `${(new Date()).toISOString()} - Hello 2 renderoutput! (${Math.random()})`

        console.log("uploadedFileContents0: ", uploadedFileContents1);
        console.log("uploadedFileContents1: ", uploadedFileContents0);

        fs.writeFileSync(tmpUpload0.name, uploadedFileContents0);
        fs.writeFileSync(tmpUpload1.name, uploadedFileContents1);
          
        form.append('files', fs.createReadStream(tmpUpload0.name), {
            filename: filename0
        });
        form.append('files', fs.createReadStream(tmpUpload1.name), {
            filename: filename1
        });

        let res;
        let prevHeaders = axios.defaults.headers;
        try {
            axios.defaults.headers = form.getHeaders();
            res = await axios.post(`${settings.current.publicUrl}/v${settings.majorVersion}/renderoutput/upload`, form, config);
        } finally {
            // don't harm other tests that will run after
            axios.defaults.headers = prevHeaders;
        }

        JasmineDeplHelpers.checkResponse(res, 201);
        let json = res.data;

        expect(json.ok).toBeTruthy();
        expect(json.type).toBe("renderoutput");
        expect( isArray(json.data.urls) ).toBeTruthy();

        expect(json.data.urls[0]).toMatch(/https:\/\/.*?\/renderoutput\/.*?\.tmp/);
        expect(json.data.urls[1]).toMatch(/https:\/\/.*?\/renderoutput\/.*?\.tmp/);

        console.log("trying to download urls: ", json.data.urls);

        let tmpDownload0 = tmp.fileSync();
        let tmpDownload1 = tmp.fileSync();

        let file0 = fs.createWriteStream(tmpDownload0.name);
        let file1 = fs.createWriteStream(tmpDownload1.name);

        let request0 = https.get(json.data.urls[0], function(response) {
            response.pipe(file0);
        });
        expect(request0).toBeTruthy();

        let request1 = https.get(json.data.urls[1], function(response) {
            response.pipe(file1);
        });
        expect(request1).toBeTruthy();

        setTimeout(function() {
            // now check what's downloaded for file 0
            let downloadedFileContents0 = fs.readFileSync(tmpDownload0.name, 'utf8');

            console.log("tmpDownload0: ", tmpDownload0.name);
            console.log("downloadedFileContents0: ", downloadedFileContents0);

            expect(downloadedFileContents0).toBe(uploadedFileContents0);

            tmpUpload0.removeCallback();
            tmpDownload0.removeCallback();

            //what's downloaded for file 1
            let downloadedFileContents1 = fs.readFileSync(tmpDownload1.name, 'utf8');

            console.log("tmpDownload1: ", tmpDownload1.name);
            console.log("downloadedFileContents1: ", downloadedFileContents1);

            expect(downloadedFileContents1).toBe(uploadedFileContents1);

            tmpUpload1.removeCallback();
            tmpDownload1.removeCallback();

            done();
        }, 100);

        // not done, wait for get response
    });
});
