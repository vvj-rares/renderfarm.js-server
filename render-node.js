"use strict";

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://rfarmmgr:123456@192.168.0.151:27017/rfarmdb';

// Create a new MongoClient
const client = new MongoClient(url);

// Use connect method to connect to the Server
var rfarmdb;
client.connect(function(err,db) {
  assert.equal(null, err);
  console.log("Connected successfully to rfarmdb database");
  rfarmdb = db.db("rfarmdb");

  /* var myobj = { name: "Company Inc", address: "Highway 37" };

  rfarmdb.collection("servers").insertOne(myobj, function(err, res) {
    if (err) throw err;
    console.log("1 document inserted");
    // db.close();
  }); */

});

// server part

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

client.close();