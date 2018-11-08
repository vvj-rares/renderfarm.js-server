"use strict";

const settings = require("./settings");

import * as express from "express";
import * as bodyParser from "body-parser";
import { injectable, multiInject } from "inversify";
import { IApp, IEndpoint } from "./interfaces";
import { TYPES } from "./types";

@injectable()
class App implements IApp {

    private _express: express.Application;

    constructor(@multiInject(TYPES.IEndpoint) endpoints: IEndpoint[]) {
        this._express = express();
        this.config();
        this.bindEndpoints(endpoints);
    }

    get express(): express.Application {
        return this._express;
    }

    private config(): void{
        // to support JSON-encoded bodies
        this._express.use(express.json());

        // to support URL-encoded bodies
        this._express.use(bodyParser.urlencoded({
          extended: true
        }));
        
        this._express.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.header('Content-Type', 'application/json');
            res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
            next();
        });
        
    }

    private bindEndpoints(endpoints: IEndpoint[]) {
        // report server status
        this._express.get('/', function (req, res) {
            console.log(`GET on /`);
            res.send(JSON.stringify({ version: settings.version }, null, 2));
        });

        for (let endp of endpoints) {
            endp.bind(this._express);
        }
    }
}

export { App };