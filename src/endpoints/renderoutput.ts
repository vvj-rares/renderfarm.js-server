import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, ISettings } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class RenderOutputEndpoint implements IEndpoint {

    private _settings: ISettings;

    constructor(@inject(TYPES.ISettings) settings: ISettings) 
    {
        this._settings = settings;
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/renderoutput/:filename`, async function (req, res) {
            console.log(`GET on /renderoutput/${req.params.filename}`);

            let mime = require('mime-types');
            let mimeType = mime.lookup(req.params.filename);

            console.log(` >> Looking up file ${req.params.filename} in folder ${this._settings.current.renderOutputLocal}`);

            let fileName = req.params.filename;
            const fs = require('fs');
            fs.readFile(`${this._settings.current.renderOutputLocal}/${fileName}`, function(err, content) {
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