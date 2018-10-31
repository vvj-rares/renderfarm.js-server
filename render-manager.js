"use strict";

const express = require('express');
const bodyParser  = require('body-parser');
const app = express();
const port = 8000;

var RenderManager = require('./RenderManager');
var renderManager = new RenderManager();

app.use(express.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({
  extended: true
})); // to support URL-encoded bodies

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Content-Type', 'application/json');
    next();
});

app.get('/', function (req, res) {
    res.send(JSON.stringify(renderManager.getStatus(), null, 2));
});

app.get('/project', function (req, res) {
    res.send(JSON.stringify(renderManager.getProjects(), null, 2));
});

app.post('/project', function (req, res) {
    let api_key = req.body.api_key;
    console.log(`GET on /project with api_key: ${api_key}`);

    //do: check if given api_key has enough permissions to list projects
    let p = renderManager.createProject(api_key);
    res.send(JSON.stringify({ id: p.guid, url: "http://localhost/project/" + p.guid }, null, 2));
});

app.put('/user', function (req, res) {
    res.send('Got a PUT request at /user')
});

app.delete('/user', function (req, res) {
    res.send('Got a DELETE request at /user')
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
