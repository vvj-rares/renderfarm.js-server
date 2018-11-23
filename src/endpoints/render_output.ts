import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks } from "../interfaces";
import { TYPES } from "../types";

var multer  = require("multer");
var upload = multer({ dest: "C:\\Temp\\" });

const settings = require("../settings");

@injectable()
class RenderOutputEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks) {
        this._database = database;
        this._checks = checks;
    }

    bind(express: express.Application) {
        express.get('/render_output', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /render_output with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.get('/render_output/:name', async function (req, res, next) {
            console.log(`GET on /render_output/${req.params.name}`);

            var options = {
                root: "C:\\Temp\\",
                dotfiles: 'deny',
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true,
                    'Content-type': 'image/png'
                }
            };

            var fileName = req.params.name;
            res.sendFile(fileName, options, function (err) {
                if (err) {
                    console.error(err);
                    res.status(404);
                } else {
                    console.log('Sent:', fileName);
                }
            });
  
        }.bind(this));

        express.post('/render_output', upload.single('somefile'), function (req, res, next) {
            console.log(`POST on /render_output`);

            var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            if (ip.indexOf("::ffff:192.168.") === -1 && ip !== "::1" && ip !== "127.0.0.1") {
                console.error(`  FAIL | request from ${ip} rejected`);
                res.status(403);
                res.end(JSON.stringify({ error: "access denied" }, null, 2));
            }

            console.log(req.file);

            const fs = require("fs");
            let dstPath = req.file.destination + req.file.originalname;
            fs.rename(req.file.destination + req.file.filename, dstPath, function(err) {
                if ( err ) {
                    // todo: also return in response
                    console.log('ERROR: ' + err);
                }
            });
            console.error(`    OK | render output was accepted: ${dstPath}`);
            res.end(JSON.stringify({ 
                success: true, 
                filename: req.file.originalname 
            }, null, 2));

            /*
{ fieldname: 'somefile',
  originalname: '2018-11-16 11_28_25-apple stocks - Google Search.png',
  encoding: '7bit',
  mimetype: 'image/png',
  destination: 'C:\\Temp\\',
  filename: 'cb40ae32ec32d9a363f0772bebc9b34e',
  path: 'C:\\Temp\\cb40ae32ec32d9a363f0772bebc9b34e',
  size: 36309 }
            */
            
        }.bind(this));

        express.put('/render_output/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /render_output/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.delete('/render_output/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /render_output/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { RenderOutputEndpoint };

//curl -F 'img_avatar=@/home/petehouston/hello.txt' http://localhost/upload