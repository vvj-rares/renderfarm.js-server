import { injectable } from "inversify";
import * as express from "express";
import { IEndpoint } from "../interfaces";

const settings = require("../settings");

@injectable()
class RenderOutputEndpoint implements IEndpoint {

    bind(express: express.Application) {
        express.get('/renderoutput/:filename', async function (req, res) {
            console.log(`GET on /renderoutput/${req.params.filename}`);

            let mime = require('mime-types');
            let mimeType = mime.lookup(req.params.filename);

            console.log(` >> Looking up file ${req.params.filename} in folder ${settings.renderOutputLocal}`);

            let options = {
                root: settings.renderOutputLocal,
                dotfiles: 'deny',
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true,
                    'Content-type': mimeType
                }
            };

            let fileName = req.params.filename;
            res.sendFile(fileName, options, function (err) {
                if (err) {
                    console.error(err);
                    res.status(404);
                    res.end();
                } else {
                    console.log('Sent:', fileName);
                }
            });

        }.bind(this));
    }
}

export { RenderOutputEndpoint };