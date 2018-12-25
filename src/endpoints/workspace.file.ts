import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase } from "../interfaces";
import { TYPES } from "../types";

const settings = require("../settings");
const majorVersion = settings.version.split(".")[0];

@injectable()
class WorkspaceFileEndpoint implements IEndpoint {
    private _database: IDatabase;

    constructor(@inject(TYPES.IDatabase) database: IDatabase) {
        this._database = database;
    }

    bind(express: express.Application) {
        express.get(`/v${majorVersion}/workspace/:guid/file/*/:filename`, async function (req, res) {
            console.log(`GET on /workspace/${req.params.guid}/file/${req.params[0]}/${req.params.filename}`);

            let workspaceGuid = req.params.guid;

            this._database.getWorkspace(workspaceGuid)
                .then(function(workspaceInfo){

                    if (!workspaceInfo.value) {
                        console.error(`  FAIL | workspace not found: ${workspaceGuid}`);
                        res.status(404);
                        res.end(JSON.stringify({ error: "workspace not found" }, null, 2));
                        return;
                    }

                    let mime = require('mime-types');
                    let mimeType = mime.lookup(req.params.filename);

                    let rootDir = `${settings.homeDir}` + req.params[0];

                    console.log(` >> Looking up file ${req.params.filename} in folder ${rootDir}`)

                    let options = {
                        root: rootDir,
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

                }.bind(this))
                .catch(function(err){
                    console.error(`  FAIL | failed to get workspace: ${workspaceGuid}, \n`, err);
                    res.status(500);
                    res.end(JSON.stringify({ error: "failed to get workspace" }, null, 2));
                }.bind(this));

        }.bind(this));
    }
}

export { WorkspaceFileEndpoint };