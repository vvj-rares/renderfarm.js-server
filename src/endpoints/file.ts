import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase, IChecks, IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";

var multer  = require("multer");
var upload = multer({ dest: "C:\\Temp\\" });

@injectable()
class FileEndpoint implements IEndpoint {
    private _database: IDatabase;
    private _checks: IChecks;

    constructor(@inject(TYPES.IDatabase) database: IDatabase,
                @inject(TYPES.IChecks) checks: IChecks) {
        this._database = database;
        this._checks = checks;
    }

    bind(express: express.Application) {
        express.get('/file', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /file with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

            res.end(JSON.stringify({}, null, 2));
        }.bind(this));

        express.get('/file/:name', async function (req, res, next) {
            console.log(`GET on /file/${req.params.name}`);

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

        express.post('/file', upload.single('somefile'), function (req, res, next) {
            console.log(req.file);
            const fs = require("fs");
            fs.rename(req.file.destination + req.file.filename, req.file.destination + req.file.originalname, function(err) {
                if ( err ) {
                    // todo: also return in response
                    console.log('ERROR: ' + err);
                }
            });
            res.end(JSON.stringify({}, null, 2));

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

        express.put('/file/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /file/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));

        express.delete('/file/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /file/${req.params.uid} with api_key: ${apiKey}`);
            if (!await this._checks.checkApiKey(res, this._database, apiKey)) return;

        }.bind(this));
    }
}

export { FileEndpoint };

//curl -F 'img_avatar=@/home/petehouston/hello.txt' http://localhost/upload