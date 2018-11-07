"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("./app");
var https = require("https");
var fs = require("fs");
var PORT = 3000;
var httpsOptions = {
    key: fs.readFileSync('../ssl/key.pem'),
    cert: fs.readFileSync('../ssl/cert.pem')
};
https.createServer(httpsOptions, app_1.default).listen(PORT, function () {
    console.log('Express server listening on port ' + PORT);
});
