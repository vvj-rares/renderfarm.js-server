import { injectable, inject } from "inversify";
import * as express from "express";
import { IMaxscriptClient } from "../interfaces";
import { TYPES } from "../types";

const net = require('net');

const settings = require("../settings");

@injectable()
class MaxscriptClient implements IMaxscriptClient {
    private _responseHandler:        (data: any) => boolean;
    private _errorHandler:           (err: any) => void;

    constructor() {
    }

    connect(ip: string): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {

            this._client = new net.Socket();
            this._client.on('data', function(data) {
                console.log(data.toString());
                if (this._responseHandler) {
                    this._responseHandler(data);
                }
            }.bind(this));
            this._client.on('error', function(err) {
                console.error(err.toString());
                if (this._errorHandler) {
                    this._errorHandler(err);
                }
            }.bind(this));

            // now connect and test a connection with some simple command
            this._client.connect(29207, ip, function() {
                console.log('Connected to remote maxscript endpoint');
            }.bind(this));

        }.bind(this));
    }

    resetScene(): Promise<boolean> {

        return new Promise<boolean>(function(resolve, reject) {
            // prepare response handlers for the command
            this._responseHandler = function(data) {
                console.log("reset scene returned: ", data.toString());
                this._responseHandler = undefined;
                resolve(true);
            },
            this._errorHandler = function(err) {
                console.error("reset scene error: ", err);
                reject(err);
            },

            // now run command
            this._client.write("resetMaxFile #noPrompt");
        }.bind(this));
    }
}

export { MaxscriptClient };

/*
var net = require('net');


client.on('close', function() {
	console.log('Connection closed');
});

// wait for input and send to server
var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line){
    line = line.trim();
    if (line === "exit") {
        client.destroy(); // kill client after server's response
        process.exit.bind(process, 0);
    }
    client.write(line);
})
*/