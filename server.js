const WebSocket = require('ws');

const wss = new WebSocket.Server({port: 3000});

console.log('WebSocket 服务器启动在 ws://localhost:3000');

// 心跳机制
function noop() {
}

function heartbeat() {
    this.isAlive = true;
}

// 每 30 秒检查一次客户端是否存活
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('检测到不活跃客户端，终止连接');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(noop);        // 发送 ping
    });
}, 30000);   // 30秒一次心跳

wss.on('connection', (ws) => {
    console.log('新客户端连接');

    ws.isAlive = true;
    ws.on('pong', heartbeat);   // 收到 pong 就标记存活

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            console.log('收到消息:', msg);

            // 处理你的各种 action
            if (msg.action === 'nextTab' || msg.action === 'prevTab' ||
                msg.action === 'gotoTab' || msg.action === 'gotoTabByTitle' ||
                msg.action === 'refreshTab') {

                // 这里广播给所有客户端（因为你的场景是 Chrome 扩展作为客户端）
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(msg));
                    }
                });
            }
        } catch (e) {
            console.error('消息解析失败:', e);
        }
    });

    ws.on('close', () => {
        console.log('客户端断开连接');
    });

    ws.on('error', (err) => {
        console.error('客户端错误:', err);
    });
});

// 优雅关闭
process.on('SIGINT', () => {
    clearInterval(interval);
    wss.close();
    process.exit(0);
});