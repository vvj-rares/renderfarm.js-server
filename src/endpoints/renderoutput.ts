import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, ISettings } from "../interfaces";
import { TYPES } from "../types";

import multer = require('multer');
import fs = require('fs');

@injectable()
class RenderOutputEndpoint implements IEndpoint {
    private _upload: any;

    constructor(@inject(TYPES.ISettings) private _settings: ISettings) 
    {
        this._upload = multer({ dest: this._settings.current.renderOutputDir });
    }

    bind(express: express.Application) {
        express.get(`/v${this._settings.majorVersion}/renderoutput/:filename`, async function (req, res) {
            console.log(`GET on /renderoutput/${req.params.filename}`);

            let mime = require('mime-types');
            let mimeType = mime.lookup(req.params.filename);

            console.log(` >> Looking up file ${req.params.filename} in folder ${this._settings.current.renderOutputDir}`);

            let fileName = req.params.filename;
            const fs = require('fs');
            fs.readFile(`${this._settings.current.renderOutputDir}/${fileName}`, function(err, content) {
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

        express.post(`/v${this._settings.majorVersion}/renderoutput`, this._upload.single('file'), async function (req, res, next) {
            console.log(`POST on /renderoutput with: `, req.file ? req.file : "undefined");

            if (!req.file) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing file", error: null }, null, 2));
                return;
            }

            /* for example: { fieldname: 'file',
            originalname: 'GUID-0B096929-58A7-4DE1-A0FD-776BEE5E3CB5.png',
            encoding: '7bit',
            mimetype: 'image/png',
            destination: 'C:\\Temp',
            filename: '2bfa6fb80365cb8c0ceeaef158b4f99a',
            path: 'C:\\Temp\\2bfa6fb80365cb8c0ceeaef158b4f99a',
            size: 3233 } */

            let oldFilename = `${this._settings.current.renderOutputDir}/${req.file.filename}`;
            let newFilename = `${this._settings.current.renderOutputDir}/${req.file.originalname}`;

            fs.renameSync(oldFilename, newFilename);

            let fileUrl = `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${req.file.originalname}`;

            res.status(201);
            res.end(JSON.stringify({ ok: true, type: "renderoutput", data: { url: fileUrl } }));
        }.bind(this))

        express.post(`/v${this._settings.majorVersion}/renderoutput/upload`, this._upload.array('files', 32), async function (req, res, next) {
            console.log(`POST on /renderoutput/upload with: `, req.files ? req.files : "undefined");

            if (!req.files || req.files.length === 0) {
                res.status(400);
                res.end(JSON.stringify({ ok: false, message: "missing files", error: null }, null, 2));
                return;
            }

            let urls: string[] = [];
            for (let i in req.files) {
                let oldFilename = `${this._settings.current.renderOutputDir}/${req.files[i].filename}`;
                let newFilename = `${this._settings.current.renderOutputDir}/${req.files[i].originalname}`;

                fs.renameSync(oldFilename, newFilename);
    
                let fileUrl = `${this._settings.current.publicUrl}/v${this._settings.majorVersion}/renderoutput/${req.files[i].originalname}`;
                urls.push(fileUrl);
            }

            res.status(201);
            res.end(JSON.stringify({ ok: true, type: "renderoutput", data: { urls: urls } }));
        }.bind(this))
    }
}

export { RenderOutputEndpoint };