import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// A local style with CARTO raster tiles avoids the separate remote style,
// vector metadata, font, sprite, and WebGL-vector requests that produced a
// black canvas on some browsers while the marker still rendered.
const MAP_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© CARTO · © OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0b1119' } },
    { id: 'carto-basemap', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 20 },
  ],
};

function markerElement(label, kind) {
  const el = document.createElement('div');
  el.className = `country-map-marker ${kind}`;
  el.setAttribute('aria-label', label);
  el.title = label;
  return el;
}

export default function CountryMap({ country, homeCountry }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !country?.coordinates) return undefined;
    setFailed(false);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: country.coordinates,
      zoom: country.population < 500000 ? 5.5 : country.population < 5000000 ? 4.5 : 3.6,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: '<a href="https://maplibre.org/">MapLibre</a>',
    }));
    map.on('error', event => { if (event?.error) setFailed(true); });
    map.on('idle', () => setFailed(false));
    mapRef.current = map;
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !country?.coordinates) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    const current = new maplibregl.Marker({ element: markerElement(`Current country: ${country.name}`, 'current') })
      .setLngLat(country.coordinates).setPopup(new maplibregl.Popup({ offset: 18 }).setText(`Current: ${country.name}`)).addTo(map);
    markersRef.current.push(current);
    if (homeCountry?.coordinates && homeCountry.id !== country.id) {
      const home = new maplibregl.Marker({ element: markerElement(`Birth country: ${homeCountry.name}`, 'home') })
        .setLngLat(homeCountry.coordinates).setPopup(new maplibregl.Popup({ offset: 15 }).setText(`Birth country: ${homeCountry.name}`)).addTo(map);
      markersRef.current.push(home);
      const bounds = new maplibregl.LngLatBounds(country.coordinates, country.coordinates).extend(homeCountry.coordinates);
      map.fitBounds(bounds, { padding: 70, maxZoom: 4.5, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900 });
    } else {
      map.flyTo({ center: country.coordinates, zoom: country.population < 500000 ? 5.5 : country.population < 5000000 ? 4.5 : 3.6, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900 });
    }
  }, [country, homeCountry]);

  return <div className="country-map-frame">
    <div ref={containerRef} className="country-map" role="img" aria-label={`Interactive map centered on ${country.name}`} />
    {failed && <div className="country-map-error" role="status">The basemap could not load. The complete country facts remain available below.</div>}
  </div>;
}
