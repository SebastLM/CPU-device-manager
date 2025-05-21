const fs = require('fs');
const WebSocket = require('ws');

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



function readCPU() {
    try { 
        const content = fs.readFileSync('/proc/stat', 'utf8');
        const cpuLine = content.split('\n').find(line => line.startsWith('cpu '));
        const parts = cpuLine.trim().split(/\s+/).slice(1, 9).map(Number);  
        return {
            user: parts[0],
            nice: parts[1],
            system: parts[2],
            idle: parts[3],
            iowait: parts[4],
            irq: parts[5],
            softirq: parts[6],
            steal: parts[7]
        };
    } catch(err) {
        console.log("error on readling from file");
    }
}


function totaltime(TotalTime) {
    return TotalTime.user + TotalTime.nice + TotalTime.system + TotalTime.idle + TotalTime.iowait + TotalTime.irq + TotalTime.softirq + TotalTime.steal;
}


function idleTime(cpuIdleTime) {
    return cpuIdleTime.idle + cpuIdleTime.iowait;
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

        const value1 = readCPU();
        await sleep(500);
        const value2 = readCPU();

        const total1 = totaltime(value1);
        const total2 = totaltime(value2);

        const idle1 = idleTime(value1);
        const idle2 = idleTime(value2);

        const totalDiff = total2 - total1;
        const idleDiff = idle2 - idle1;

        const usage = 100 * (1 - idleDiff / totalDiff);
    
        ws.send(JSON.stringify({usage: usage.toFixed(3)}));
        
        await sleep(500);
    }
}

