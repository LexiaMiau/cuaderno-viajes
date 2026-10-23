/* ================================================================
   model.js — estructura de datos, utilidades de fechas y helpers
   Todo cuelga del espacio de nombres global `App` (scripts clásicos,
   sin módulos, para poder abrir index.html con doble clic).
   ================================================================ */
window.App = window.App || {};

(function (App) {
  let counter = 0;
  App.uid = (prefix) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  // Escapa texto antes de meterlo en innerHTML (los datos son del usuario)
  App.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Fechas ---------- */
  App.todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  // Un viaje es "pasado" cuando su fecha de fin ya ha quedado atrás (fecha real de hoy)
  App.tripStatus = (trip) => (trip.endDate && trip.endDate < App.todayISO() ? "past" : "upcoming");

  App.formatDateRange = (start, end) => {
    if (!start && !end) return "Fechas por definir";
    const fmt = (iso, withYear) => new Date(iso + "T00:00:00").toLocaleDateString("es-ES", withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
    if (start && end) return `${fmt(start, false)} – ${fmt(end, true)}`;
    return fmt(start || end, true);
  };
  App.daysBetween = (start, end) => {
    if (!start || !end) return 0;
    return Math.round((new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000) + 1;
  };
  App.formatDayDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  App.addDaysISO = (iso, n) => {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  /* ---------- Fábricas ---------- */
  App.newTextBlock = (content = "") => ({ id: App.uid("blk"), type: "text", content });
  App.newAccommodationBlock = (d = {}) => ({ id: App.uid("blk"), type: "accommodation", name: d.name || "", checkIn: d.checkIn || "", checkOut: d.checkOut || "", address: d.address || "", price: d.price ?? "" });
  App.newFlightBlock = (d = {}) => ({ id: App.uid("blk"), type: "flight", airline: d.airline || "", flightNumber: d.flightNumber || "", from: d.from || "", to: d.to || "", departure: d.departure || "", arrival: d.arrival || "", price: d.price ?? "" });
  App.newPlanBBlock = (d = {}) => ({ id: App.uid("blk"), type: "planb", title: d.title || "Plan B / Clima", content: d.content || "", open: false });
  App.newGPXBlock = (gpxText = null) => ({ id: App.uid("blk"), type: "gpx", gpxText, route: null, meta: null, manual: false });

  App.BLOCK_MAKERS = {
    text: () => App.newTextBlock(),
    gpx: () => App.newGPXBlock(),
    accommodation: () => App.newAccommodationBlock(),
    flight: () => App.newFlightBlock(),
    planb: () => App.newPlanBBlock(),
  };

  App.newDay = (label, date = "") => ({ id: App.uid("day"), label, date, blocks: [] });

  App.newTrip = ({ title = "", startDate = "", endDate = "", destinations = [], notes = "" } = {}) => {
    const trip = {
      id: App.uid("trip"), title, startDate, endDate, destinations: [...destinations], notes,
      days: [], budget: [], checklist: [], createdAt: new Date().toISOString(),
    };
    // Un día por cada fecha del rango (máx. 60); si no hay fechas, un día vacío
    const n = Math.min(App.daysBetween(startDate, endDate), 60);
    if (n > 0) for (let i = 0; i < n; i++) trip.days.push(App.newDay(`Día ${i + 1}`, App.formatDayDate(App.addDaysISO(startDate, i))));
    else trip.days.push(App.newDay("Día 1"));
    return trip;
  };

  App.newBudgetItem = (d = {}) => ({ id: App.uid("bud"), concept: d.concept || "", category: d.category || "Otros", amount: d.amount ?? "", paid: !!d.paid });
  App.newCheckItem = (text = "", done = false) => ({ id: App.uid("chk"), text, done });

  App.BUDGET_CATEGORIES = ["Transporte", "Alojamiento", "Comida", "Actividades", "Otros"];

  // "1.250,50" / "1250.5" / "35 €" → número (o 0)
  App.parseAmount = (v) => {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v ?? "").replace(/[^\d.,-]/g, "");
    if (!s) return 0;
    if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (s.includes(",")) s = s.replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };
  App.formatMoney = (n) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 });

  // Copia profunda con ids nuevos (para duplicar un viaje)
  App.cloneTrip = (trip) => {
    const copy = JSON.parse(JSON.stringify(trip));
    copy.id = App.uid("trip");
    copy.title = (trip.title || "Viaje") + " (copia)";
    copy.createdAt = new Date().toISOString();
    copy.days.forEach((d) => { d.id = App.uid("day"); d.blocks.forEach((b) => { b.id = App.uid("blk"); }); });
    (copy.budget || []).forEach((b) => { b.id = App.uid("bud"); });
    (copy.checklist || []).forEach((c) => { c.id = App.uid("chk"); });
    return copy;
  };
})(window.App);
