import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase } from "../interfaces";
import { TYPES } from "../types";

var multer  = require("multer");
var upload = multer({ dest: "C:\\Temp\\" });

const settings = require("../settings");

@injectable()
class RenderOutputEndpoint implements IEndpoint { todo: remove this endpoint completely
    private _database: IDatabase;

    constructor(@inject(TYPES.IDatabase) database: IDatabase) {
        this._database = database;
    }

    bind(express: express.Application) {
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

        todo: remove post on render_output
        express.post('/render_output', upload.single('somefile'), function (req, res, next) {
            console.log(`POST on /render_output`);

            var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            if (!ip.startsWith("192.168.") && !ip.startsWith("::ffff:192.168.") && ip !== "::1" && ip !== "127.0.0.1") {
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
            
        }.bind(this));
    }
}

export { RenderOutputEndpoint };

//curl -F 'img_avatar=@/home/petehouston/hello.txt' http://localhost/upload