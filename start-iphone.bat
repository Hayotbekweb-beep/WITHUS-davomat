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
echo iPhone va noutbuk bitta Wi-Fi da bo'lsin. QR kodni iPhone kamerasi bilan skanerlang.
echo Ulanmasa: oynani yopib, start-iphone-tunnel.bat ni ishga tushiring.
call npx expo start --go
pause
