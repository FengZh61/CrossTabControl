@echo off
title Node Server Auto Restart

:loop
node server.js
echo 服务器已停止，5秒后重启...
timeout /t 5 >nul
goto loop