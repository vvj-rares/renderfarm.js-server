import { Settings } from "../settings";
import { isFunction } from "util";

const dgram = require('dgram');

const simulateWorkersCount = 2;

const settings = new Settings("dev");

let workers: any[] = [];
for (let i=0; i<simulateWorkersCount; i++) {
    let worker = {
        hbcount: 1,
        pid: Math.round(1000 + 8000 * Math.random()),
        port: Math.round(10000 + 50000 * Math.random())
    };
    //todo: each worker should actually open the port
    workers.push(worker);
}

let client = null;

setInterval(function() {
    for (let k=0; k<workers.length; k++) {
        let w = workers[k];
        let heartbeat = {
            id: w.hbcount++,
            type: "heartbeat",
            sender: "remote-maxscript",
            version: "1.0.0",
            pid: w.pid,
            mac: "00112233445566",
            port: w.port,
            cpu_usage: 0.5 * Math.random(),
            ram_usage: 0.1 + Math.random() / 50,
            total_ram: 32
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
console.log('Press Ctrl+C to exit');