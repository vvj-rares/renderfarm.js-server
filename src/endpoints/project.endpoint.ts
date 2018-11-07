import { injectable, inject } from "inversify";
import * as express from "express";
import { IEndpoint, IDatabase } from "../interfaces";
import { TYPES } from "../types";

@injectable()
class ProjectEndpoint implements IEndpoint {
    private _database: IDatabase;

    constructor(@inject(TYPES.IDatabase) database: IDatabase) {
        this._database = database;
    }

    bind(express: express.Application) {
        express.get('/project', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`GET on /project with api_key: ${api_key}`);

            res.send(JSON.stringify({}, null, 2));
        });

        express.get('/project/:uid', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`GET on /project/${req.params.uid} with api_key: ${api_key}`);
        
            res.send(JSON.stringify({}, null, 2));
        });
        
        express.post('/project', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`POST on /project with api_key: ${api_key}`);

            res.send(JSON.stringify({}, null, 2));
        });

        express.put('/project/:uid', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`PUT on /project/${req.params.uid} with api_key: ${api_key}`);
        
            res.send(JSON.stringify({}, null, 2));
        });

        express.delete('/project/:uid', function (req, res) {
            let api_key = req.body.api_key;
            console.log(`DELETE on /project/${req.params.uid} with api_key: ${api_key}`);
        
            res.send(JSON.stringify({}, null, 2));
        });
    }
}

export { ProjectEndpoint };