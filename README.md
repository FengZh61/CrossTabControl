# 远程控制Chrome浏览器页签

# 设计思路
后端启用一个websocket服务，插件监听websocket服务，写一个html页面用于远程控制，通过页面发送指令到websocket服务端，插件接收到websocket服务的消息，根据指令去操作浏览器页签。

# 安装使用

## 安装nodejs

## 下载项目

## 打开Chrome浏览器的开发者模式，加载未打包的扩展程序，选择项目文件夹
<img width="1907" height="819" alt="image" src="https://github.com/user-attachments/assets/8a08433b-c6d3-4620-a33a-5566f3fd92f0" />


**加载成功**

<img width="431" height="263" alt="image" src="https://github.com/user-attachments/assets/58664436-0a24-4213-aca5-28144c6e32c2" />

## 启动后端服务
<img width="974" height="108" alt="image" src="https://github.com/user-attachments/assets/d01ff58a-841c-40aa-85b4-620750f34a31" />

## 打开ctrl-tab.html切换页签
<img width="1123" height="783" alt="image" src="https://github.com/user-attachments/assets/02d70682-7cb6-4bf0-9749-480596db0c58" />

# 调试测试

## 端口配置
`server.js`中`const wss = new WebSocket.Server({port: 3000});`,3000是服务端口，按需修改。

`background.js`中`ws = new WebSocket("ws://localhost:3000");`,3000是服务端口，按需修改。

`ctrl-tab.html`中`const ws = new WebSocket("ws://localhost:3000");`,3000是服务端口，按需修改。

3个文件中的端口号需保持一致。

## 注意
选择加载未打包的扩展程序加载插件，修改项目代码后，刷新插件后，代码生效，同时注意，本地插件项目代码文件夹不要移动位置或修改文件夹名称。

<img width="412" height="266" alt="image" src="https://github.com/user-attachments/assets/e67b5355-7d7a-42c5-a7ac-a47bf3497882" />

# 插件打包

<img width="1287" height="765" alt="image" src="https://github.com/user-attachments/assets/d6ca5153-1752-443e-93a8-26ac9ed89abf" />


打包即可，打包后的插件可以加载到任意一台电脑的Chrome浏览器，不再依赖本地项目文件夹。

高版本的浏览器已经无法加载自行打包的插件，只能通过开发者模式加载未打包的文件夹来使用。
