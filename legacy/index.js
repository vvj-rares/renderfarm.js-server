// On Windows Only ...
const { spawn } = require('child_process');
const bat = spawn('cmd.exe', ['/C', 'ping 8.8.8.8']);

bat.stdout.on('data', (data) => {
  console.log(data.toString());
});

bat.stderr.on('data', (data) => {
  console.log(data.toString());
});

bat.on('exit', (code) => {
  console.log(`Child exited with code ${code}`);
});