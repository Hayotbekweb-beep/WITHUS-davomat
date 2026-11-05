#!/bin/bash
# WITHUS Davomat web versiyasini ofis serveriga o'rnatish (Debian 12).
# Ishlatish:  sudo bash install.sh DOMEN withus-davomat-web.zip
# Mavjud xizmatlarga (withus-bot va boshqalar) tegmaydi.
set -euo pipefail
DOMAIN="${1:?Domen kiriting, masalan: davomat.withustrip.uz}"
ZIP="${2:?withus-davomat-web.zip fayl manzilini kiriting}"

apt-get update -q
apt-get install -y -q nginx certbot python3-certbot-nginx unzip

# Fayllarni joylash (eski versiya zaxiraga olinadi)
if [ -d /var/www/withus-davomat ]; then
  mv /var/www/withus-davomat "/var/www/withus-davomat.bak-$(date +%Y%m%d-%H%M%S)"
fi
mkdir -p /var/www/withus-davomat
unzip -q "$ZIP" -d /var/www/withus-davomat
chown -R www-data:www-data /var/www/withus-davomat

# nginx sozlamasi
CONF=/etc/nginx/sites-available/withus-davomat
sed "s/DOMEN/$DOMAIN/" "$(dirname "$0")/nginx-withus-davomat.conf" > "$CONF"
ln -sf "$CONF" /etc/nginx/sites-enabled/withus-davomat
nginx -t
systemctl reload nginx

# HTTPS sertifikat (Let's Encrypt, avtomatik yangilanadi)
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect

echo
echo "Tayyor: https://$DOMAIN"
