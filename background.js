let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;
const HEARTBEAT_INTERVAL = 20000;     // 20秒 ping（更积极）
const KEEPALIVE_INTERVAL = 15000;     // 15秒保活

let heartbeatTimer = null;
let keepaliveTimer = null;
let portKeepAliveTimer = null;        // 新增：long-lived port 保活

// ==================== 核心：使用 long-lived port 显著提升存活率 ====================
let alivePort = null;

function keepServiceWorkerAlive() {
  // 如果已有 port，先清理
  if (alivePort) alivePort.disconnect();

  // 连接到一个持久 port（推荐方式）
  alivePort = chrome.runtime.connect({ name: "keepAlive" });

  alivePort.onDisconnect.addListener(() => {
    console.log("Keep-alive port 已断开，重新建立...");
    setTimeout(keepServiceWorkerAlive, 1000);
  });

  // 每 10 秒通过 port 发送消息，强制保持 SW 活跃
  if (portKeepAliveTimer) clearInterval(portKeepAliveTimer);
  portKeepAliveTimer = setInterval(() => {
    if (alivePort) {
      try {
        alivePort.postMessage({ type: "PING" });
      } catch (e) {
        console.warn("port 发送失败，重新建立");
        keepServiceWorkerAlive();
      }
    }
  }, 10000);
}

// ==================== WebSocket 连接 ====================
function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  console.log(`[SW] 正在连接 WebSocket... (尝试 ${reconnectAttempts + 1})`);
  ws = new WebSocket("ws://localhost:3000");

  ws.onopen = () => {
    console.log("✅ WebSocket 已连接");
    reconnectAttempts = 0;
    startHeartbeat();
    startKeepAlive();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.action === "ping" || msg.action === "pong") return;

      console.log("收到消息:", msg);

      if (msg.action === "nextTab") switchTab(1);
      else if (msg.action === "prevTab") switchTab(-1);
      else if (msg.action === "gotoTab" && msg.index !== undefined) switchToIndex(msg.index);
      else if (msg.action === "gotoTabByTitle" && msg.title) switchToTabByTitle(msg.title);
      else if (msg.action === "refreshTab") refreshCurrentTab();
    } catch (e) {
      console.error("消息解析失败:", e);
    }
  };

  ws.onclose = () => {
    console.log("❌ WebSocket 断开");
    stopTimers();
    attemptReconnect();
  };

  ws.onerror = (err) => console.error("WebSocket 错误:", err);
}

// 指数退避重连（保持你的逻辑）
function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn("达到最大重连次数，停止重连");
    return;
  }
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(1.8, reconnectAttempts) + Math.random() * 800, 20000);
  setTimeout(connect, delay);
}

function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "ping" }));
    }
  }, HEARTBEAT_INTERVAL);
}

function startKeepAlive() {
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  keepaliveTimer = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});   // 简单 API 调用重置计时器
  }, KEEPALIVE_INTERVAL);
}

function stopTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  heartbeatTimer = keepaliveTimer = null;
}

// ==================== 初始化 ====================
// 浏览器启动时唤醒
chrome.runtime.onStartup.addListener(() => {
  console.log("浏览器启动，service worker 被唤醒");
  connect();
  keepServiceWorkerAlive();
});

// 扩展安装/更新时也尝试连接
chrome.runtime.onInstalled.addListener(() => {
  console.log("扩展安装/更新，启动 WebSocket");
  connect();
  keepServiceWorkerAlive();
});
chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
        console.log("title:", tab.title);
    });
});
chrome.tabs.query({}, (tabs) => {
    console.log("所有 tabs:", tabs);
});
// 启动
connect();
keepServiceWorkerAlive();   // 最重要的一行

// ====================== 标签页控制函数 ======================

function switchTab(direction) {
    chrome.tabs.query({currentWindow: true}, (tabs) => {
        chrome.tabs.query({active: true, currentWindow: true}, (activeTabs) => {
            if (!activeTabs[0]) return;
            let index = activeTabs[0].index;
            let nextIndex = (index + direction + tabs.length) % tabs.length;
            chrome.tabs.update(tabs[nextIndex].id, {active: true});
        });
    });
}

function switchToIndex(index) {
    chrome.tabs.query({currentWindow: true}, (tabs) => {
        if (tabs[index]) {
            chrome.tabs.update(tabs[index].id, {active: true});
        } else {
            console.warn(`索引 ${index} 超出范围，当前共有 ${tabs.length} 个标签页`);
        }
    });
}

function switchToTabByTitle(title) {
    if (!title || typeof title !== "string") return;

    const searchTitle = title.toLowerCase().trim();

    chrome.tabs.query({currentWindow: true}, (tabs) => {
        // 优先精确匹配
        let targetTab = tabs.find(tab => tab.title.toLowerCase() === searchTitle);

        // 再模糊匹配
        if (!targetTab) {
            targetTab = tabs.find(tab => tab.title.toLowerCase().includes(searchTitle));
        }

        if (targetTab) {
            chrome.tabs.update(targetTab.id, {active: true});
            console.log(`已切换到: ${targetTab.title}`);
        } else {
            console.warn(`未找到包含 "${title}" 的标签页`);
        }
    });
}

// 新增：刷新当前标签页
function refreshCurrentTab() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.reload(tabs[0].id, () => {
                console.log("已刷新当前标签页");
            });
        }
    });
}
