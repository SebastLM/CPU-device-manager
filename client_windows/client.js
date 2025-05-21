const fs = require('fs');
const { exec } = require("child_process");
const util = require('util');
const execPromise = util.promisify(exec);
const WebSocket = require('ws');

const psCommand = `
    $cores = (Get-WmiObject Win32_ComputerSystem).NumberOfLogicalProcessors;
    $cpu1 = (Get-Process | Measure-Object -Property CPU -Sum).Sum;
    Start-Sleep -Seconds 1;
    $cpu2 = (Get-Process | Measure-Object -Property CPU -Sum).Sum;
    $cpuPercent = (($cpu2 - $cpu1) / 1) / $cores * 100;
    "{0:N3}%" -f $cpuPercent
  `;


let usage = 0
var interrupt = false;


SERVER_URL = process.argv[2];

const ws = new WebSocket(SERVER_URL);


process.on('SIGINT', function() {
    interrupt = true;
});


ws.on('open', () => {
    console.log('Connected to server');
    monitorCPU();
});



ws.on('close', () => {
    console.log('Disconnected from server');
});



ws.on('error', (err) => {
    console.log('WebSocket error:', err.message);
});





async function cpuUsage() {
    
    const {stdout} = await execPromise(`powershell -Command "${psCommand.replace(/\n/g, '')}"`);
    console.log('CPU Usage:', cpuValue);
    return stdout.trim;
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




async function monitorCPU(){

    while(ws.readyState === WebSocket.OPEN) {
        
        if (interrupt) {
            if (ws.readyState === WebSocket.OPEN) {
                await new Promise((resolve) =>
                    ws.send(JSON.stringify({SigHandler:'end'}), resolve)
                );
                ws.close();
            }

            return 'ended from the client side';
        }

        const usageStr = await cpuUsage();
        const usage = parseFloat(usageStr.replace('%', ''));

        ws.send(JSON.stringify({usage: usage.toFixed(3)}));
        
        await sleep(500);
    }
}

