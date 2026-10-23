/* ================================================================
   store.js — capa de datos
   Toda la app lee y escribe a través de `App.Store`. Hoy guarda en el
   navegador (localStorage); el "adaptador" es lo único que habría que
   cambiar para guardar en la nube (Supabase) sin tocar el resto.
   ================================================================ */
(function (App) {
  const KEY = "cuaderno-viajes:v1";
  const SCHEMA_VERSION = 1;
  const MAX_ROUTE_POINTS = 1500; // para no llenar el almacenamiento con tracks enormes

  /* ---------- Adaptador: navegador ---------- */
  const LocalAdapter = {
    name: "local",
    load() {
      try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
      catch (e) { console.warn("No se pudo leer el almacenamiento:", e); return null; }
    },
    save(data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
      catch (e) { console.warn("No se pudo guardar:", e); return false; }
    },
  };

  /* ---------- Serialización ---------- */
  // Quita lo que no hace falta guardar (texto GPX crudo, horas de cada punto)
  // y reduce los tracks muy largos conservando las estadísticas ya calculadas.
  function serialize(trips) {
    const clone = JSON.parse(JSON.stringify(trips, (k, v) => (k === "gpxText" || k === "time" ? undefined : v)));
    clone.forEach((t) => t.days.forEach((d) => d.blocks.forEach((b) => {
      if (b.type === "gpx" && b.route && b.route.points && b.route.points.length > MAX_ROUTE_POINTS) {
        const step = b.route.points.length / MAX_ROUTE_POINTS;
        const reduced = [];
        for (let i = 0; i < MAX_ROUTE_POINTS; i++) reduced.push(b.route.points[Math.floor(i * step)]);
        reduced.push(b.route.points[b.route.points.length - 1]);
        b.route.points = reduced;
      }
    })));
    return clone;
  }

  // Normaliza datos antiguos o incompletos para que la app nunca se rompa
  function migrate(raw) {
    const trips = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.trips) ? raw.trips : []);
    return trips.filter((t) => t && typeof t === "object").map((t) => ({
      id: t.id || App.uid("trip"),
      title: t.title || "",
      startDate: t.startDate || "",
      endDate: t.endDate || "",
      destinations: Array.isArray(t.destinations) ? t.destinations : [],
      notes: t.notes || "",
      createdAt: t.createdAt || new Date().toISOString(),
      budget: Array.isArray(t.budget) ? t.budget : [],
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
      days: (Array.isArray(t.days) && t.days.length ? t.days : [App.newDay("Día 1")]).map((d) => ({
        id: d.id || App.uid("day"), label: d.label || "Día", date: d.date || "",
        blocks: Array.isArray(d.blocks) ? d.blocks.filter((b) => b && App.BLOCK_MAKERS[b.type]) : [],
      })),
    }));
  }

  /* ---------- Store ---------- */
  const Store = {
    adapter: LocalAdapter,
    trips: [],
    onStatus: null, // función(status) "saved" | "error" | "saving"
    _timer: null,
    seeded: false,

    init() {
      const saved = this.adapter.load();
      if (saved) {
        this.trips = migrate(saved);
      } else {
        // Primera vez: viajes de ejemplo para ver la app en acción
        this.trips = migrate(App.sampleTrips ? App.sampleTrips() : []);
        this.seeded = true;
      }
      this.trips.forEach((t) => t.days.forEach((d) => d.blocks.forEach((b) => { if (b.type === "gpx") App.ensureRoute(b); })));
      if (this.seeded) this.saveNow();
    },

    get(id) { return this.trips.find((t) => t.id === id) || null; },
    add(trip) { this.trips.push(trip); this.touch(); return trip; },
    remove(id) { this.trips = this.trips.filter((t) => t.id !== id); this.touch(); },

    // Llamar tras cualquier cambio: guarda con un pequeño retraso para agrupar ediciones
    touch() {
      if (this.onStatus) this.onStatus("saving");
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.saveNow(), 400);
    },
    saveNow() {
      clearTimeout(this._timer);
      const ok = this.adapter.save({ version: SCHEMA_VERSION, savedAt: new Date().toISOString(), trips: serialize(this.trips) });
      if (this.onStatus) this.onStatus(ok ? "saved" : "error");
      return ok;
    },

    /* ---------- Copia de seguridad ---------- */
    exportJSON(tripId) {
      const trips = tripId ? [this.get(tripId)].filter(Boolean) : this.trips;
      return JSON.stringify({ version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), trips: serialize(trips) }, null, 2);
    },
    // Devuelve cuántos viajes se importaron. Si un id ya existe, se le asigna uno nuevo.
    importJSON(text) {
      const data = JSON.parse(text); // lanza si no es JSON válido
      const incoming = migrate(data);
      if (!incoming.length) throw new Error("El archivo no contiene viajes.");
      incoming.forEach((t) => {
        if (this.get(t.id)) {
          const title = t.title;
          const copy = App.cloneTrip(t);
          copy.title = title;
          t = copy;
        }
        t.days.forEach((d) => d.blocks.forEach((b) => { if (b.type === "gpx") App.ensureRoute(b); }));
        this.trips.push(t);
      });
      this.touch();
      return incoming.length;
    },
  };

  App.Store = Store;
})(window.App);
