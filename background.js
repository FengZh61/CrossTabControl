chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
        console.log("title:", tab.title);
    });
});
chrome.tabs.query({}, (tabs) => {
    console.log("所有 tabs:", tabs);
});

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 15;
const HEARTBEAT_INTERVAL = 25000;     // 25秒发送一次 ping
const KEEPALIVE_INTERVAL = 20000;     // 20秒保活 service worker
let heartbeatTimer = null;
let keepaliveTimer = null;

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("WebSocket 已连接，无需重复连接");
    return;
  }

  console.log(`正在连接 WebSocket... (尝试第 ${reconnectAttempts + 1} 次)`);
  
  ws = new WebSocket("ws://localhost:3000");

  ws.onopen = () => {
    console.log("✅ WebSocket 已成功连接到服务器");
    reconnectAttempts = 0;
    startHeartbeat();
    startKeepAlive();
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      console.error("JSON 解析失败:", e);
      return;
    }

    // 忽略自己的 ping/pong
    if (msg.action === "ping" || msg.action === "pong") return;

    console.log("收到服务器消息:", msg);

    if (msg.action === "nextTab") switchTab(1);
    else if (msg.action === "prevTab") switchTab(-1);
    else if (msg.action === "gotoTab" && msg.index !== undefined) switchToIndex(msg.index);
    else if (msg.action === "gotoTabByTitle" && msg.title) switchToTabByTitle(msg.title);
    else if (msg.action === "refreshTab") refreshCurrentTab();
  };

  ws.onclose = (event) => {
    console.log(`❌ WebSocket 断开 (code: ${event.code})`);
    stopTimers();
    attemptReconnect();
  };

  ws.onerror = (error) => {
    console.error("WebSocket 错误:", error);
  };
}

// 指数退避重连
function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn("已达到最大重连次数，请检查服务器是否正常运行");
    return;
  }

  reconnectAttempts++;
  // 指数退避 + 随机抖动（防止大量客户端同时重连）
  const delay = Math.min(1000 * Math.pow(1.8, reconnectAttempts) + Math.random() * 1000, 15000);

  console.log(`将在 ${Math.round(delay/1000)} 秒后进行第 ${reconnectAttempts} 次重连...`);
  
  setTimeout(() => {
    connect();
  }, delay);
}

// 应用层心跳
function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ action: "ping" }));
      } catch (e) {
        console.warn("发送 ping 失败");
      }
    }
  }, HEARTBEAT_INTERVAL);
}

// Service Worker 保活（防止 Chrome 杀掉 background）
function startKeepAlive() {
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  
  keepaliveTimer = setInterval(() => {
    // 发送一个无关紧要的 Chrome API 调用来重置 service worker 计时器
    chrome.tabs.query({ active: true, currentWindow: true }, () => {
      // 什么都不做，只是唤醒
    });
  }, KEEPALIVE_INTERVAL);
}

function stopTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  heartbeatTimer = null;
  keepaliveTimer = null;
}

connect();

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
