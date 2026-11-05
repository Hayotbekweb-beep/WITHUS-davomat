#!/bin/bash
# Yangi versiyani o'rnatish:  sudo bash update.sh withus-davomat-web.zip
set -euo pipefail
ZIP="${1:?withus-davomat-web.zip fayl manzilini kiriting}"
NEW=$(mktemp -d)
unzip -q "$ZIP" -d "$NEW"
rm -rf /var/www/withus-davomat.prev
[ -d /var/www/withus-davomat ] && mv /var/www/withus-davomat /var/www/withus-davomat.prev
mv "$NEW" /var/www/withus-davomat
chown -R www-data:www-data /var/www/withus-davomat
chmod 755 /var/www/withus-davomat
echo "Yangilandi. Muammo bo'lsa: rm -rf /var/www/withus-davomat && mv /var/www/withus-davomat.prev /var/www/withus-davomat"
