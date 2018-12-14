import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class WorkspaceFileEndpoint implements IEndpoint {
    private _database: IDatabase;

    constructor(@inject(TYPES.IDatabase) database: IDatabase) {
        this._database = database;
    }

    bind(express: express.Application) {
        // express.get('/workspace/:guid/file/*/:filename', async function (req, res) {
        //     console.log(`GET on /workspace/${req.params.guid}/file/${req.params[0]}/${req.params.filename}`);

        //     var mime = require('mime-types');
        //     var mimeType = mime.lookup(req.params.filename);

        //     var options = {
        //         root: "C:\\Temp\\" + req.params[0], todo: take root path from workspace info
        //         dotfiles: 'deny',
        //         headers: {
        //             'x-timestamp': Date.now(),
        //             'x-sent': true,
        //             'Content-type': mimeType
        //         }
        //     };

        //     var fileName = req.params.filename;
        //     res.sendFile(fileName, options, function (err) {
        //         if (err) {
        //             console.error(err);
        //             res.status(404);
        //             res.end();
        //         } else {
        //             console.log('Sent:', fileName);
        //         }
        //     });

        // }.bind(this));
    }
}

export { WorkspaceFileEndpoint };