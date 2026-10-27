@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo WITHUS Davomat - iPhone test (Expo Go)
where node >nul 2>nul || (echo Node.js topilmadi. https://nodejs.org dan LTS versiyani o'rnating. & pause & exit /b 1)
if not exist node_modules (
  echo Paketlar o'rnatilmoqda, 2-5 daqiqa...
  call npm install
)
echo.
echo Tunnel rejimi: Wi-Fi shart emas. QR kodni iPhone kamerasi bilan skanerlang.
call npx expo start --go --tunnel
pause
