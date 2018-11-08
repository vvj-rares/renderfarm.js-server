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
            if (!await checkApiKey(res, this._database, apiKey)) return;

            this._database.getProjects(apiKey)
                .then(function(arr){
                    console.error(`    OK | returned ${arr.length} projects`);
                    res.send(JSON.stringify(arr, null, 2));
                })
                .catch(function(err){
                    console.error(`    FAIL | failed to retrieve projects\n`, err);
                    res.status(500);
                    res.send(JSON.stringify({ error: "failed to retrieve projects" }, null, 2));
                });
        }.bind(this));

        express.get('/project/:uid', async function (req, res) {
            let apiKey = req.query.api_key;
            console.log(`GET on /project/${req.params.uid} with api_key: ${apiKey}`);
            if (!await checkApiKey(res, this._database, apiKey)) return;

            this._database.getProject(apiKey, req.params.uid)
                .then(function(project) {
                    res.send(JSON.stringify(project, null, 2));
                }.bind(this))
                .catch(function(err) {
                    console.error(`    FAIL | failed to get project\n`, err);
                    res.status(500);
                    res.send(JSON.stringify({ error: "failed to get project" }, null, 2));
                }.bind(this));
        }.bind(this));

        express.post('/project', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`POST on /project with api_key: ${apiKey}`);
            if (!await checkApiKey(res, this._database, apiKey)) return;

            let name = req.body.name;

            this._database.createProject(apiKey, name)
                .then(function(project) {
                    res.send(JSON.stringify(project, null, 2));
                }.bind(this))
                .catch(function(err) {
                    console.error(`    FAIL | failed to create project\n`, err);
                    res.status(500);
                    res.send(JSON.stringify({ error: "failed to create project" }, null, 2));
                }.bind(this));
        }.bind(this));

        express.put('/project/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`PUT on /project/${req.params.uid} with api_key: ${apiKey}`);
            if (!await checkApiKey(res, this._database, apiKey)) return;

            this._database.getProject(apiKey, req.params.uid)
                .then(function(project) {

                    project.fromJSON(req.body);
                    this._database.updateProject(apiKey, project)
                        .then(function() {
                            res.send(JSON.stringify(project, null, 2));
                        })
                        .catch(function(err) {
                            console.error(`    FAIL | failed to update project ${req.params.uid}\n`, err);
                            res.status(500);
                            res.send(JSON.stringify({ error: "failed to update project" }, null, 2));
                        });

                }.bind(this))
                .catch(function(err) {
                    console.error(`    FAIL | failed to get project ${req.params.uid}\n`, err);
                    res.status(500);
                    res.send(JSON.stringify({ error: "failed to get project" }, null, 2));
                }.bind(this));
        }.bind(this));

        express.delete('/project/:uid', async function (req, res) {
            let apiKey = req.body.api_key;
            console.log(`DELETE on /project/${req.params.uid} with api_key: ${apiKey}`);
            if (!await checkApiKey(res, this._database, apiKey)) return;

            res.send(JSON.stringify({}, null, 2));
        }.bind(this));
    }
}

export { ProjectEndpoint };