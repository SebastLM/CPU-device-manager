
const WebSocket = require('ws');
const readline = require('readline');




/*
const { Worker } = require('worker_threads');
const worker = new Worker('./worker.js');
 */



const PORT = 8080;
const devices = new Map(); // Map IP -> index

// Clear screen
function clearScreen() {
    process.stdout.write('\x1b[3J\x1b[2J\x1b[H');
}

// Draw all devices' CPU status
function drawLayout() {
    clearScreen();
    for (const [ip, index] of devices.entries()) {
        const line = index * 2 + 1;
        process.stdout.write(`\x1b[${line};1H${ip}:`);
        process.stdout.write(`\x1b[${line + 1};3HCPU usage: (Loading)`);
        
    }
}


// Update CPU usage for a specific device
function updateCPU(ip, usage) {
    const index = devices.get(ip);
    if (index === undefined) return;

    const line = index * 2 + 2;
    process.stdout.write(`\x1b[${line};14H`); // Move to CPU usage line
    process.stdout.write('\x1b[K');           // Clear the line
    process.stdout.write(` ${usage.toFixed(3)}%`);
}

function addDevice(ip) {
    if (!devices.has(ip)) {
        devices.set(ip, devices.size);
        drawLayout();
    }
}

function removeDevice(ip) {
    if (!devices.has(ip)) {return;}
    devices.delete(ip);

    const newDevices = new Map();
    let index = 0;
    for (const key of devices.keys()) {
        newDevices.set(key, index++);
    }

    devices.clear();

    for (const [key, newIndex] of newDevices.entries()) {
        devices.set(key, newIndex);
    }

    drawLayout();
}


// Create WebSocket server
const wss = new WebSocket.Server({ port: PORT }, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    clearScreen();
});

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress.replace(/^.*:/, ''); // Clean IPv6-mapped IPv4
    
    addDevice(ip);

    ws.on('message', (message) => {
        //if (message =)
        const data = JSON.parse(message.toString());
        if (data.SigHandler === 'end' ) {
            removeDevice(ip);
        }  
        //if (typeof data.cpu === 'number') { 
        const usage = parseFloat(data.usage);    
        //console.log(usage.toFixed(3).toString());
        updateCPU(ip, usage);
            
    });

    ws.on('close', () => {
        // Optional: remove devices on disconnect
        // Not redrawing layout here to avoid flickering
    });
});