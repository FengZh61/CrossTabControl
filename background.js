let ws;
chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
        console.log("title:", tab.title);
    });
});
chrome.tabs.query({}, (tabs) => {
    console.log("所有 tabs:", tabs);
});

function connect() {
    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
        console.log("✅ WebSocket 已连接到服务器");
    };

    ws.onmessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch (e) {
            console.error("JSON 解析失败:", e);
            return;
        }

        console.log("收到消息:", msg);

        // === 下面这些才是正确的写法 ===
        if (msg.action === "nextTab") {
            switchTab(1);
        }
        if (msg.action === "prevTab") {
            switchTab(-1);
        }
        if (msg.action === "gotoTab" && msg.index !== undefined) {
            switchToIndex(msg.index);
        }
        if (msg.action === "gotoTabByTitle" && msg.title) {
            switchToTabByTitle(msg.title);
        }
        if (msg.action === "refreshTab") {
            refreshCurrentTab();
        }
    };

    ws.onclose = () => {
        console.log("WebSocket 断开，3秒后自动重连...");
        setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
        console.error("WebSocket 错误:", error);
    };
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