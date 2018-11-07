"use strict";

const settings = require("./settings");

import * as https from "https";
import * as fs from "fs";

import { myContainer } from "./inversify.config";
import { TYPES } from "./types";
import { IDatabase, IApp } from "./interfaces";

console.log("Connecting to database...");

const database = myContainer.get<IDatabase>(TYPES.IDatabase);
database.connect(settings.connectionUrl)
    .then(function() {
        console.log("    OK | Database connected");
        console.log("Starting server...");

        const httpsOptions = {
            key: fs.readFileSync(settings.sslKey),
            cert: fs.readFileSync(settings.sslCert)
        };

        const app = myContainer.get<IApp>(TYPES.IApp);
        https.createServer(httpsOptions, app.express).listen(settings.port, () => {
            console.log("    OK | Express server listening on port " + settings.port);
        });
    })
    .catch(function(err) {
        console.log("    FAIL | Failed to connect to the database\n", err);
    });
