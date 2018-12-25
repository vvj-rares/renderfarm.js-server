import { injectable } from "inversify";
import * as express from "express";
import { IEndpoint } from "../interfaces";

const settings = require("../settings");
const majorVersion = settings.version.split(".")[0];

@injectable()
class RenderOutputEndpoint implements IEndpoint {

    bind(express: express.Application) {
        express.get(`/v${majorVersion}/renderoutput/:filename`, async function (req, res) {
            console.log(`GET on /renderoutput/${req.params.filename}`);

            let mime = require('mime-types');
            let mimeType = mime.lookup(req.params.filename);

            console.log(` >> Looking up file ${req.params.filename} in folder ${settings.renderOutputLocal}`);

            let fileName = req.params.filename;
            const fs = require('fs');
            fs.readFile(`${settings.renderOutputLocal}/${fileName}`, function(err, content) {
                if (err) {
                    console.error(err);
                    res.status(404);
                    res.end();
                } else {
                    console.log('Sent:', fileName);
                    res.writeHead(200, { 
                        'Content-Type': mimeType, 
                        'x-timestamp': Date.now(), 
                        'x-sent': true 
                    });
                    res.end(content);
                }
            });

        }.bind(this));
    }
}

export { RenderOutputEndpoint };