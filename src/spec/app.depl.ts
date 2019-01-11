import "reflect-metadata";
import axios from "axios";
import { Settings } from "../settings";

require("../jasmine.config")();

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
});