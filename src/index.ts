"use strict";

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
    await database.connect(settings.current.connectionUrl);
    
    console.log("    OK | Database connected");
    console.log("Starting server...");

    const httpsOptions = {
        key: fs.readFileSync(settings.current.sslKey),
        cert: fs.readFileSync(settings.current.sslCert)
    };

    const app = myContainer.get<IApp>(TYPES.IApp);
    https.createServer(httpsOptions, app.express).listen(settings.current.port, () => {
        console.log("    OK | Express server listening on port " + settings.current.port);
    });
}

main();