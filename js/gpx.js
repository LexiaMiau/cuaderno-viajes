/* ================================================================
   gpx.js — lectura de archivos .gpx (Wikiloc), cálculo de estadísticas,
   mapa Leaflet y perfil de elevación.
   El mapa va aislado con try/catch: si Leaflet no carga, la tarjeta
   sigue mostrando los datos.
   ================================================================ */
(function (App) {
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  const formatMinutes = (total) => {
    const h = Math.floor(total / 60), m = Math.round(total % 60);
    return h === 0 ? `${m} min` : `${h}h ${String(m).padStart(2, "0")}min`;
  };
  // Regla de Naismith: 4 km/h + 1 h por cada 600 m de subida
  const estimateMinutes = (km, gain) => (km / 4) * 60 + (gain / 600) * 60;

  App.parseGPX = function (xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, "text/xml");
    if (xml.querySelector("parsererror")) throw new Error("El archivo no es un XML válido.");
    let nodes = Array.from(xml.getElementsByTagName("trkpt"));
    if (nodes.length === 0) nodes = Array.from(xml.getElementsByTagName("rtept"));
    if (nodes.length === 0) throw new Error("No se han encontrado puntos de track (<trkpt>).");
    const nameNode = xml.querySelector("trk > name") || xml.querySelector("metadata > name");
    const name = nameNode ? nameNode.textContent.trim() : "Ruta sin nombre";
    const points = nodes.map((n) => {
      const ele = n.getElementsByTagName("ele")[0], time = n.getElementsByTagName("time")[0];
      return { lat: parseFloat(n.getAttribute("lat")), lon: parseFloat(n.getAttribute("lon")), ele: ele ? parseFloat(ele.textContent) : null, time: time ? new Date(time.textContent) : null };
    });
    let distanceKm = 0, gain = 0, loss = 0;
    for (let i = 1; i < points.length; i++) {
      const p = points[i], q = points[i - 1];
      distanceKm += haversineKm(q.lat, q.lon, p.lat, p.lon);
      if (q.ele !== null && p.ele !== null) {
        const diff = p.ele - q.ele;
        if (diff > 0.5) gain += diff; else if (diff < -0.5) loss += -diff; // umbral contra el ruido GPS
      }
    }
    const first = points[0].time, last = points[points.length - 1].time;
    const durationLabel = first && last && last > first
      ? formatMinutes((last - first) / 60000) + " (real)"
      : formatMinutes(estimateMinutes(distanceKm, gain)) + " (est.)";
    return { name, points, distanceKm, gain, loss, durationLabel };
  };

  App.metaFromRoute = (route) => ({
    name: route.name || "",
    distance: route.distanceKm.toFixed(1) + " km",
    gain: route.gain ? "+" + Math.round(route.gain) + " m" : "",
    loss: route.loss ? "−" + Math.round(route.loss) + " m" : "",
    duration: route.durationLabel || "",
  });
  App.emptyMeta = () => ({ name: "", distance: "", gain: "", loss: "", duration: "" });

  // Adjunta una ruta al bloque. Solo rellena los campos vacíos: nunca pisa lo escrito a mano.
  App.attachGPXToBlock = (block, route) => {
    block.route = route;
    const fresh = App.metaFromRoute(route);
    if (!block.meta) block.meta = fresh;
    else Object.keys(fresh).forEach((k) => { if (!block.meta[k]) block.meta[k] = fresh[k]; });
  };

  // Bloques cargados con texto .gpx crudo (datos de ejemplo): se interpretan una vez
  App.ensureRoute = (block) => {
    if (!block.route && block.gpxText) {
      try { App.attachGPXToBlock(block, App.parseGPX(block.gpxText)); block.gpxText = null; }
      catch (e) { console.warn("GPX no válido:", e.message); }
    }
    if (!block.meta) block.meta = App.emptyMeta();
  };

  App.downloadRoutePoints = (route, customName) => {
    const blob = new Blob([JSON.stringify(route.points.map((p) => ({ lat: p.lat, lon: p.lon, ele: p.ele })), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const base = ((customName || route.name || "ruta").trim() || "ruta").replace(/\s+/g, "_");
    const a = document.createElement("a"); a.href = url; a.download = `${base}_puntos.json`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- Mapa + perfil de elevación ---------- */
  App.renderGPXVisuals = function (block, route) {
    const latlngs = route.points.map((p) => [p.lat, p.lon]);
    const mapEl = document.getElementById(`map-${block.id}`);
    try {
      if (typeof L === "undefined") throw new Error("Leaflet no está disponible");
      const map = L.map(mapEl, { zoomControl: false, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      const line = L.polyline(latlngs, { color: "#3F5D45", weight: 4, opacity: 0.9 }).addTo(map);
      L.circleMarker(latlngs[0], { radius: 6, color: "#3F5D45", fillColor: "#3F5D45", fillOpacity: 1 }).addTo(map).bindTooltip("Inicio");
      L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: "#B5652D", fillColor: "#B5652D", fillOpacity: 1 }).addTo(map).bindTooltip("Fin");
      map.fitBounds(line.getBounds(), { padding: [24, 24] });
      setTimeout(() => map.invalidateSize(), 60);
    } catch (err) {
      if (mapEl) mapEl.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs text-center px-4" style="color:var(--muted);">Mapa no disponible ahora mismo. Los datos de la ruta se han guardado igualmente.</div>`;
      console.warn("No se pudo montar el mapa:", err.message);
    }
    try {
      const svg = document.getElementById(`elev-${block.id}`);
      const w = 600, h = 60, pad = 4;
      const eles = route.points.map((p) => p.ele).filter((e) => e !== null && e !== undefined);
      if (svg && eles.length >= 2 && route.distanceKm > 0) {
        const min = Math.min(...eles), max = Math.max(...eles), range = (max - min) || 1;
        let cum = 0;
        const coords = route.points.map((p, i) => {
          if (i > 0) cum += haversineKm(route.points[i - 1].lat, route.points[i - 1].lon, p.lat, p.lon);
          return [(cum / route.distanceKm) * (w - pad * 2) + pad, h - pad - (((p.ele ?? min) - min) / range) * (h - pad * 2)];
        });
        const line = "M" + coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
        svg.innerHTML = `<path d="${line} L${w - pad},${h} L${pad},${h} Z" fill="rgba(63,93,69,0.08)"/><path d="${line}" fill="none" stroke="#3F5D45" stroke-width="1.5"/>`;
      }
    } catch (err) { console.warn("No se pudo dibujar el perfil de elevación:", err.message); }
  };
})(window.App);
