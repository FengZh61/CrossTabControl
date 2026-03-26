# 远程控制Chrome浏览器页签

# 设计思路
后端启用一个websocket服务，插件监听websocket服务，写一个html页面用于远程控制，通过页面发送指令到websocket服务端，插件接收到websocket服务的消息，根据指令去操作浏览器页签。

# 安装使用

## 安装nodejs

## 下载项目

## 打开Chrome浏览器的开发者模式

<img width="463" height="116" alt="image" src="https://github.com/user-attachments/assets/b889a11f-9995-4a33-9656-ec8350f84a9c" />

## 点击左上角加载未打包的扩展程序，选择项目文件夹
<img width="1096" height="796" alt="image" src="https://github.com/user-attachments/assets/0cb402c1-2766-4506-923c-2a73a01093eb" />

**加载成功**

<img width="431" height="263" alt="image" src="https://github.com/user-attachments/assets/58664436-0a24-4213-aca5-28144c6e32c2" />

## 启动后端服务
<img width="710" height="58" alt="image" src="https://github.com/user-attachments/assets/41070c6e-658a-4ac0-b417-0cbc7f27eee7" />
