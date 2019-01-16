import { Settings } from "../settings";
import { isFunction, isNumber, isString } from "util";

const dgram = require('dgram');
const net   = require('net');
const fs    = require('fs');

function fileAppendText(filename: string, text: string) {
    let fd;

    try {
        fd = fs.openSync(filename, 'a');
        fs.appendFileSync(fd, text, 'utf8');
    } catch (err) {
        console.log(err);
    } finally {
        if (fd !== undefined) {
            fs.closeSync(fd);
        }
    }
}

const settings = new Settings("dev");

console.log(JSON.stringify({ argv: process.argv }));

let simulateWorkersCount = 1;

let regex1 = RegExp("count=\\d+");
let countArg = process.argv.find(e => regex1.test(e));
if (countArg) {
    simulateWorkersCount = parseInt(countArg.split("=")[1]);
}

console.log(JSON.stringify({ status: `starting fake workers...` }));
console.log(JSON.stringify({ workerCount: simulateWorkersCount }));

let workers: any[] = [];
for (let i=0; i<simulateWorkersCount; i++) {
    let worker: any = {
        hbcount: 1,
        pid: Math.round(1000 + 8000 * Math.random()),
        port: Math.round(10000 + 50000 * Math.random()),
        responseDelay: 100, // how much time it takes until response
        response: "OK",     // controls what gonna be the response on maxscript request
        heartbeat: true,    // control if heartbeats are being sent
        logfile: null       // where to output maxscript commands?
    };

    // each worker opens port, echos requests to console and replies OK
    var server = net.createServer(function (socket) {

        socket.on("data", function (obj) {
            let w = this;
            let request = obj.toString();

            let isControlRequest = false;
            let controlJson = null;
            try {
                // normal worker will accept only MaxScript commands, 
                // but fake worker treat json requests as control data
                controlJson = JSON.parse(request);
                isControlRequest = true;
            } catch (err) {
                isControlRequest = false;
            }

            if (isControlRequest) {
                console.log(JSON.stringify({ control: controlJson }));

                // if worker is defined, we apply received changes on current worker
                if (controlJson.worker) {
                    for (let j in controlJson.worker) {
                        // don't let override critical worker properties
                        if (j === "hbcount" || j === "pid" || j === "port" || j === "server") continue;
                        w[j] = controlJson.worker[j];
                    }
                }

                socket.write("{ \"result\": true }");

            } else {
                console.log(JSON.stringify({ maxscript: request }));

                if (this.logfile) {
                    let testRun  = (this.testRun && isString(this.testRun))   ? this.testRun  : "undefined";
                    let testName = (this.testName && isString(this.testName)) ? this.testName : "undefined";
                    let testGuid = (this.testGuid && isString(this.testGuid)) ? this.testGuid : "undefined";
                    fileAppendText(this.logfile, `${new Date().toISOString()}\t${testRun}\t${testName}\t${testGuid}\t[request]\t${request}\r\n`);
                }

                let t0 = new Date();
                let t1: Date;
                let responseDelayMs = (isNumber(this.responseDelay) && this.responseDelay >= 0 && this.responseDelay < 1 * 60 * 1000)
                    ? this.responseDelay
                    : 0;

                if (this.$timeout) {
                    console.log(JSON.stringify({ warning: `worker is flooded with requests` }));
                }

                let response1 = this.response;
                this.$timeout = setTimeout(function () {
                    delete this.$timeout;
                    socket.write(response1);
                    console.log(JSON.stringify({ response: response1 }));
                    if (this.logfile) {
                        let testRun  = (this.testRun && isString(this.testRun))   ? this.testRun  : "undefined";
                        let testName = (this.testName && isString(this.testName)) ? this.testName : "undefined";
                        let testGuid = (this.testGuid && isString(this.testGuid)) ? this.testGuid : "undefined";
                        fileAppendText(this.logfile, `${new Date().toISOString()}\t${testRun}\t${testName}\t${testGuid}\t[response]\t${response1}\r\n`);
                    }
                }.bind(this), responseDelayMs);
            }
        }.bind(this));

        socket.on("error", function (err) {
            console.log(JSON.stringify({ error: err}));
        }.bind(this));

    }.bind(worker));

    server.listen(worker.port, '0.0.0.0');
    worker.server = server;

    console.log(JSON.stringify({ status: `Worker [${i}] is listening on port: ${worker.port}`}));

    workers.push(worker);
}

let client = null;

setInterval(function() {
    for (let k=0; k<workers.length; k++) {
        let w = workers[k];
        if (!w.heartbeat) {
            continue; // not send heartbeats for some workers
        }

        let heartbeat = {
            id: w.hbcount++,
            type: "heartbeat",
            sender: "remote-maxscript",
            version: isString(w.version) ? w.version : "1.0.0",
            pid: w.pid,
            mac: isString(w.mac) ? w.mac : "00000000000000",
            port: w.port,
            cpu_usage: isNumber(w.cpuUsage) ? w.cpuUsage : (0.5 * Math.random()),
            ram_usage: isNumber(w.ramUsage) ? w.ramUsage : (0.1 + Math.random() / 50),
            total_ram: isNumber(w.totalRam) ? w.totalRam : 32
        };
        
        let hbstr = JSON.stringify(heartbeat);
        const message = Buffer.from(hbstr);
        if (!client) {
            client = dgram.createSocket('udp4');
        }
        
        // console.log(`to: ${settings.current.host}:${settings.current.heartbeatPort} ${hbstr}`);
        client.send(message, settings.current.heartbeatPort, settings.current.host, (err) => {
            if (err) {
                if (client) {
                    client.close();
                    client = null;
                }
            }
        });
    }
}, 1000);

//let it run until Ctrl+C
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
if (isFunction(process.stdin.setRawMode)) {
    process.stdin.setRawMode(true);
}
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        process.exit();
    }
});
console.log(JSON.stringify({ status: `Press Ctrl+C to exit` }));