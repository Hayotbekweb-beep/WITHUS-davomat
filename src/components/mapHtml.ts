// Leaflet + OpenStreetMap sahifasi (mobil WebView va brauzer iframe uchun umumiy)
export const HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%}
.lbl{background:#fff;border-radius:6px;padding:2px 6px;font:12px sans-serif;box-shadow:0 1px 3px #0004;white-space:nowrap}</style>
</head><body><div id="m"></div><script>
var map=L.map('m',{zoomControl:true}).setView([41.31,69.28],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var layer=L.layerGroup().addTo(map), fitted=false;
map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({lat:e.latlng.lat,lng:e.latlng.lng}))});
window.update=function(d){
  layer.clearLayers(); var pts=[];
  (d.circles||[]).forEach(function(c){L.circle([c.lat,c.lng],{radius:c.radius,color:c.color,weight:2,fillOpacity:.12}).addTo(layer);pts.push([c.lat,c.lng]);});
  (d.markers||[]).forEach(function(m){
    L.circleMarker([m.lat,m.lng],{radius:9,color:'#fff',weight:2,fillColor:m.color,fillOpacity:1}).addTo(layer)
     .bindTooltip(m.label,{permanent:true,direction:'top',className:'lbl',offset:[0,-8]});
    pts.push([m.lat,m.lng]);});
  if(d.center){map.setView([d.center.lat,d.center.lng],d.zoom||16);}
  else if(!fitted&&pts.length){fitted=true; if(pts.length===1)map.setView(pts[0],16); else map.fitBounds(pts,{padding:[40,40],maxZoom:17});}
};
</script></body></html>`;
