// OpenStreetMap + Leaflet: Google Maps API kaliti talab qilinmaydi
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
}
export interface MapCircle {
  lat: number;
  lng: number;
  radius: number;
  color: string;
}
