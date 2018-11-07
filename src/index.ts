import app from "./app";
import * as https from "https";
import * as fs from "fs";
import { Database } from "./database/database";

const PORT = 3000;

const httpsOptions = {
    key: fs.readFileSync("../ssl/key.pem"),
    cert: fs.readFileSync("../ssl/cert.pem")
}

// let database = new Database();
const url: string = 'mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb';
/* 
database.connect(url, function() {
    console.log("Connected");
    database.getApiKey("0");
}, function() {
    console.log("Failed to connect");
}); */

import { myContainer } from "./inversify.config";
import { TYPES } from "./types";
import { Warrior, IDatabase } from "./interfaces";

const database = myContainer.get<IDatabase>(TYPES.IDatabase);
database.connect(url, async function() {
    console.log("Connected");
    let res = await database.getApiKey("75f5-4d53-b0f4");
    console.log(res.value);
}, function() {
    console.log("Failed to connect");
});

https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log("Express server listening on port " + PORT);
})