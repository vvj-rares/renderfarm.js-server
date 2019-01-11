import { Settings } from "../src/settings";

const settings = new Settings("dev");

const dgram = require('dgram');

let hbcount = 1;
let pid = Math.round(1000 + 8000 * Math.random());
let port = Math.round(10000 + 50000 * Math.random());
let client;

setInterval(function() {
    let heartbeat = {
        id: hbcount++,
        type: "heartbeat",
        sender: "remote-maxscript",
        version: "1.0.0",
        pid: pid,
        mac: "00112233445566",
        port: port,
        cpu_usage: 0.5 * Math.random(),
        ram_usage: 0.1 + Math.random() / 50,
        total_ram: 32
    };
    
    let hbstr = JSON.stringify(heartbeat);
    const message = Buffer.from(hbstr);
    if (!client) {
        client = dgram.createSocket('udp4');
    }
    
    console.log(`to: ${settings.current.host}:${settings.current.heartbeatPort} ${hbstr}`);
    client.send(message, settings.current.heartbeatPort, settings.current.host, (err) => {
        client.close();
        client = undefined;
    });
    
}, 1000);

//let it run until Ctrl+C
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        client.close();
        process.exit();
    }
});
console.log('Press Ctrl+C to exit');