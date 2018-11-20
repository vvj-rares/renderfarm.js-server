"use strict";

const settings = require("./settings");

import * as https from "https";
import * as fs from "fs";

import { myContainer } from "./inversify.config";
import { TYPES } from "./types";
import { IDatabase, IApp } from "./interfaces";


/* udp listener */
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

  /* rfarmdb.collection("servers").findOne({ ip: rinfo.address }, function(err, result) {
    if (err) throw err;
    console.log(result.name);
    db.close();
  }); */

});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(3000);

// client.close();
// end of udp listener

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
