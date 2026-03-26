# 远程控制Chrome浏览器页签

# 设计思路
后端启用一个websocket服务，插件监听websocket服务，写一个html页面用于远程控制，通过页面发送指令到websocket服务端，插件接收到websocket服务的消息，根据指令去操作浏览器页签。
