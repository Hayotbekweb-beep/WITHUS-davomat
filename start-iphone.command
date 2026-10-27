#!/bin/bash
# Mac uchun: ikki marta bosing (birinchi marta: o'ng tugma → Open)
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js topilmadi. https://nodejs.org dan LTS versiyani o'rnating."; read; exit 1; }
[ -d node_modules ] || npm install
echo "QR kodni iPhone kamerasi bilan skanerlang. Ulanmasa: npx expo start --go --tunnel"
npx expo start --go
