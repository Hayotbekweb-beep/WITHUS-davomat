export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// GPS xatoligini hisobga olib hudud ichidami — aniqlik yomon bo'lsa
// 50 m gacha qo'shimcha imkon beriladi.
export function isInside(
  lat: number,
  lng: number,
  accuracy: number | null | undefined,
  zone: { lat: number; lng: number; radius: number },
): boolean {
  const tolerance = Math.min(accuracy ?? 0, 50);
  return distanceM(lat, lng, zone.lat, zone.lng) <= zone.radius + tolerance;
}
