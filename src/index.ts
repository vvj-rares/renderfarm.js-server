"use strict";

import * as http from "http";
import * as https from "https";
import * as fs from "fs";

import { myContainer } from "./inversify.config";
import { TYPES } from "./types";
import { IDatabase, IApp, ISettings } from "./interfaces";

const settings: ISettings = myContainer.get<ISettings>(TYPES.ISettings);
console.log(`Starting api version: ${settings.version}`);

async function main() {
    console.log("Connecting to database...");

    const database = myContainer.get<IDatabase>(TYPES.IDatabase);
    await database.connect();
    await database.createCollections();
    
    console.log("    OK | Database connected");
    console.log("Starting server...");

    const app = myContainer.get<IApp>(TYPES.IApp);

    if (settings.current.protocol === "https") {
        const httpsOptions = {
            key: fs.readFileSync(settings.current.sslKey),
            cert: fs.readFileSync(settings.current.sslCert)
        };

        https.createServer(httpsOptions, app.express).listen(settings.current.port, () => {
            console.log("    OK | Express HTTPS server listening on port " + settings.current.port);
        });
    } else if (settings.current.protocol === "http") {
        http.createServer(app.express).listen(settings.current.port, () => {
            console.log("    OK | Express HTTP server listening on port " + settings.current.port);
        });
    } else {
        console.error("Unexpected protocol: " + settings.current.protocol);
    }
}

main();