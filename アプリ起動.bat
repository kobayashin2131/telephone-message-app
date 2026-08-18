@echo off
chcp 65001 > nul
echo ======================================================================
echo   Connect Suite (社内チャット ＋ 電話連絡CallSync) を起動中...
echo ======================================================================
echo.

cd /d "%~dp0frontend"

start http://localhost:5173
npm run dev

pause
