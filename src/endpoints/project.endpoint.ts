import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase } from "../interfaces";
import { TYPES } from "../types";

async function checkApiKey(res: any, database: IDatabase, apiKey: string) {
    let apiKeyRec = await database.getApiKey(apiKey);
    if (apiKeyRec.value) {
        console.log(`    OK | api_key ${apiKey} accepted`);
        return true;
    } else {
        console.log(`    FAIL | api_key ${apiKey} declined`);
        res.status(403);
        res.send(JSON.stringify({ error: "api_key declined" }, null, 2));
        return false;
    }
}

@injectable()
class ProjectEndpoint implements IEndpoint {
    private _database: IDatabase;

    constructor(@inject(TYPES.IDatabase) database: IDatabase) {
        this._database = database;
    }

    bind(express: express.Application) {
        express.get('/project', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /project with api_key: ${apiKey}`);
            if (!checkApiKey(res, this._database, apiKey)) return;

            this._database.getProjects(apiKey)
                .then(function(arr){
                    console.error(`    OK | returned ${arr.length} projects`);
                    res.send(JSON.stringify(arr, null, 2));
                })
                .catch(function(err){
                    console.error(`    FAIL | failed to retrieve projects`, err);
                    res.status(500);
                    res.send(JSON.stringify({ error: "failed to retrieve projects" }, null, 2));
                });
        }.bind(this));

        express.get('/project/:uid', function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /project/${req.params.uid} with api_key: ${apiKey}`);
            if (!checkApiKey(res, this._database, apiKey)) return;

            res.send(JSON.stringify({}, null, 2));
        });

        express.post('/project', function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /project with api_key: ${apiKey}`);
            if (!checkApiKey(res, this._database, apiKey)) return;

            res.send(JSON.stringify({}, null, 2));
        });

        express.put('/project/:uid', function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /project/${req.params.uid} with api_key: ${apiKey}`);
            if (!checkApiKey(res, this._database, apiKey)) return;

            res.send(JSON.stringify({}, null, 2));
        });

        express.delete('/project/:uid', function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /project/${req.params.uid} with api_key: ${apiKey}`);
            if (!checkApiKey(res, this._database, apiKey)) return;

            res.send(JSON.stringify({}, null, 2));
        });
    }
}

export { ProjectEndpoint };