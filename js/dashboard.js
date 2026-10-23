/* ================================================================
   dashboard.js — pantalla "Mis viajes": tarjetas, nuevo viaje,
   duplicar/eliminar y copia de seguridad (exportar/importar).
   ================================================================ */
(function (App) {
  const $ = (id) => document.getElementById(id);
  const I = App.ui.ICONS;
  const GRADIENTS = [
    "linear-gradient(135deg,#3F5D45,#7fa387)", "linear-gradient(135deg,#B5652D,#dba06c)",
    "linear-gradient(135deg,#3A5A6E,#82abc0)", "linear-gradient(135deg,#6b5a80,#ab98c4)",
  ];
  // El color de portada depende del id, así no cambia cuando cambia el orden de las tarjetas
  const gradientFor = (id) => GRADIENTS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % GRADIENTS.length];

  App.downloadFile = (name, text, type = "application/json") => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  App.deleteTripFlow = async (tripId, goHome) => {
    const trip = App.Store.get(tripId); if (!trip) return;
    const ok = await App.ui.confirm({
      title: `¿Eliminar "${trip.title || "viaje sin título"}"?`,
      text: "Se borrarán todos sus días, bloques, presupuesto y checklist. Te recomendamos exportarlo antes si quieres conservar una copia.",
      okLabel: "Eliminar viaje", danger: true,
    });
    if (!ok) return;
    App.Store.remove(tripId);
    App.ui.toast("Viaje eliminado");
    if (goHome) App.go("#/"); else App.Dashboard.render();
  };

  function renderCard(trip) {
    const card = document.createElement("div");
    card.className = "trip-card card-hover rounded-2xl overflow-hidden bg-white";
    card.style.cssText = "border:1px solid var(--line);";
    card.dataset.tripId = trip.id;
    card.innerHTML = `
      <div class="cover-open cursor-pointer h-32 relative flex items-end p-4" style="background:${gradientFor(trip.id)};">
        <p class="cover-label font-display text-white text-xl leading-tight drop-shadow-sm">${App.esc(trip.destinations[0] || trip.title || "Viaje")}</p>
        <button class="card-menu absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center" style="background:rgba(255,255,255,.85); color:var(--ink);" title="Más opciones">${I.more}</button>
      </div>
      <div class="p-4">
        <p class="title-field font-display text-lg mb-1.5" contenteditable="true" data-placeholder="Viaje sin título"></p>
        <div class="dates-slot text-xs mb-3" style="color:var(--muted);"></div>
        <div class="tags-slot flex flex-wrap items-center gap-1.5"></div>
      </div>`;
    card.querySelector(".cover-open").addEventListener("click", (e) => { if (e.target.closest(".card-menu")) return; App.go(`#/viaje/${trip.id}`); });
    card.querySelector(".card-menu").addEventListener("click", (e) => {
      e.stopPropagation();
      App.ui.popMenu(e.currentTarget, [
        { label: "Abrir", onClick: () => App.go(`#/viaje/${trip.id}`) },
        { label: "Duplicar", onClick: () => { App.Store.add(App.cloneTrip(trip)); App.ui.toast("Viaje duplicado"); App.Dashboard.render(); } },
        { label: "Exportar", onClick: () => App.downloadFile(`${(trip.title || "viaje").replace(/\s+/g, "_")}.json`, App.Store.exportJSON(trip.id)) },
        { label: "Eliminar", danger: true, onClick: () => App.deleteTripFlow(trip.id, false) },
      ]);
    });
    const title = card.querySelector(".title-field"), label = card.querySelector(".cover-label");
    title.textContent = trip.title;
    title.addEventListener("click", (e) => e.stopPropagation());
    title.addEventListener("input", () => { trip.title = title.textContent; if (!trip.destinations.length) label.textContent = trip.title || "Viaje"; App.Store.touch(); });
    // Si cambian las fechas puede cambiar la sección (próximo ↔ pasado): se vuelve a pintar todo
    App.ui.renderEditableDates(card.querySelector(".dates-slot"), trip, () => App.Dashboard.render());
    App.ui.renderEditableTags(card.querySelector(".tags-slot"), trip, () => { label.textContent = trip.destinations[0] || trip.title || "Viaje"; });
    return card;
  }

  const Dashboard = {
    render() {
      const trips = App.Store.trips;
      const upcoming = trips.filter((t) => App.tripStatus(t) === "upcoming").sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
      const past = trips.filter((t) => App.tripStatus(t) === "past").sort((a, b) => (b.endDate || "").localeCompare(a.endDate || ""));
      const fill = (gridId, secId, list) => {
        const grid = $(gridId); grid.innerHTML = "";
        list.forEach((t) => grid.appendChild(renderCard(t)));
        $(secId).classList.toggle("is-hidden", list.length === 0);
      };
      fill("upcomingGrid", "upcomingSection", upcoming);
      fill("pastGrid", "pastSection", past);
      $("emptyState").classList.toggle("is-hidden", trips.length > 0);
    },

    /* ---------- Modal "Nuevo viaje" ---------- */
    tags: [],
    openNew() {
      ["newTripName", "newTripStart", "newTripEnd", "newTripTagInput"].forEach((id) => { $(id).value = ""; });
      $("newTripError").classList.add("is-hidden");
      this.tags = []; this.paintTags();
      $("newTripModal").classList.remove("is-hidden");
      $("newTripName").focus();
    },
    closeNew() { $("newTripModal").classList.add("is-hidden"); },
    paintTags() {
      const box = $("newTripTagChips");
      box.innerHTML = this.tags.map((t, i) => `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style="background:rgba(63,93,69,0.08); color:var(--moss-dark);">${App.esc(t)}<button data-i="${i}" class="remove-tag-btn" style="color:var(--moss-dark);">${I.close}</button></span>`).join("");
      box.querySelectorAll(".remove-tag-btn").forEach((b) => b.addEventListener("click", () => { this.tags.splice(+b.dataset.i, 1); this.paintTags(); }));
    },
    create() {
      const name = $("newTripName").value.trim(), start = $("newTripStart").value, end = $("newTripEnd").value;
      const err = $("newTripError");
      const fail = (m) => { err.textContent = m; err.classList.remove("is-hidden"); };
      if (!name) { fail("Ponle un nombre al viaje."); $("newTripName").focus(); return; }
      if (start && end && end < start) { fail("La fecha de fin no puede ser anterior a la de inicio."); return; }
      // Si dejaste un destino a medio escribir en el campo, también cuenta
      const pending = $("newTripTagInput").value.trim();
      if (pending) this.tags.push(pending);
      const trip = App.newTrip({ title: name, startDate: start, endDate: end, destinations: this.tags });
      App.Store.add(trip);
      this.closeNew();
      App.go(`#/viaje/${trip.id}/itinerario`);
    },

    /* ---------- Copia de seguridad ---------- */
    backupMenu(anchor) {
      App.ui.popMenu(anchor, [
        { label: "Exportar todos los viajes", onClick: () => App.downloadFile(`cuaderno-viajes-${App.todayISO()}.json`, App.Store.exportJSON()) },
        { label: "Importar desde archivo", onClick: () => $("importInput").click() },
      ]);
    },
    importFile(file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try { const n = App.Store.importJSON(ev.target.result); App.ui.toast(`${n} ${n === 1 ? "viaje importado" : "viajes importados"}`); this.render(); }
        catch (e) { App.ui.toast("No se pudo importar: " + (e.message || "archivo no válido"), "error"); }
      };
      reader.readAsText(file);
    },
  };
  App.Dashboard = Dashboard;
})(window.App);
