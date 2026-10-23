/* ================================================================
   trip.js — la vista de un viaje: cabecera editable + pestañas
   (Resumen · Itinerario · Reservas · Presupuesto · Checklist).
   Para añadir una pestaña nueva: entrada en TABS y una función render.
   ================================================================ */
(function (App) {
  const I = App.ui.ICONS;
  const $ = (id) => document.getElementById(id);
  const touch = () => App.Store.touch();

  const TABS = [
    { id: "resumen", label: "Resumen", render: renderSummary },
    { id: "itinerario", label: "Itinerario", render: renderItinerary },
    { id: "reservas", label: "Reservas", render: renderBookings },
    { id: "presupuesto", label: "Presupuesto", render: renderBudget },
    { id: "checklist", label: "Checklist", render: renderChecklist },
  ];

  const TripView = {
    trip: null,
    tab: "resumen",

    show(tripId, tab) {
      const trip = App.Store.get(tripId);
      if (!trip) { App.go("#/"); return; }
      this.trip = trip;
      this.tab = TABS.some((t) => t.id === tab) ? tab : "resumen";
      this.renderHeader();
      this.renderTabs();
      this.renderTab();
      window.scrollTo(0, 0);
    },

    /* ---------- Cabecera ---------- */
    renderHeader() {
      const trip = this.trip;
      const title = $("editorTitle");
      title.textContent = trip.title;
      title.oninput = () => { trip.title = title.textContent; touch(); };
      App.ui.renderEditableDates($("editorDates"), trip, () => { if (this.tab === "resumen") this.renderTab(); });
      App.ui.renderEditableTags($("editorTags"), trip, null);
      $("tripMenuBtn").onclick = (e) => {
        e.stopPropagation();
        App.ui.popMenu($("tripMenuBtn"), [
          { label: "Duplicar viaje", onClick: () => { const c = App.cloneTrip(trip); App.Store.add(c); App.ui.toast("Viaje duplicado"); App.go(`#/viaje/${c.id}`); } },
          { label: "Exportar este viaje", onClick: () => App.downloadFile(`${(trip.title || "viaje").replace(/\s+/g, "_")}.json`, App.Store.exportJSON(trip.id)) },
          { label: "Eliminar viaje", danger: true, onClick: () => App.deleteTripFlow(trip.id, true) },
        ]);
      };
    },

    renderTabs() {
      $("tripTabs").innerHTML = TABS.map((t) => `<button class="tab ${t.id === this.tab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`).join("");
      $("tripTabs").onclick = (e) => {
        const b = e.target.closest(".tab"); if (!b) return;
        App.go(`#/viaje/${this.trip.id}/${b.dataset.tab}`);
      };
    },

    renderTab() {
      const root = $("tripContent");
      root.innerHTML = "";
      const tab = TABS.find((t) => t.id === this.tab);
      try { tab.render(this.trip, root); }
      catch (err) { console.warn("Error en la pestaña", this.tab, err); root.innerHTML = `<p class="text-sm" style="color:var(--clay);">No se ha podido mostrar esta pestaña (${App.esc(err.message)}).</p>`; }
    },

    // Ir a un bloque concreto del itinerario (desde Reservas)
    goToBlock(blockId) {
      this.tab = "itinerario";
      history.replaceState(null, "", `#/viaje/${this.trip.id}/itinerario`);
      this.renderTabs(); this.renderTab();
      const el = document.querySelector(`[data-block-id="${blockId}"]`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.style.transition = "background .3s"; el.style.background = "rgba(63,93,69,.10)";
        setTimeout(() => { el.style.background = ""; }, 1400);
      }
    },
  };
  App.TripView = TripView;

  /* ================================================================
     Utilidades de datos (compartidas entre pestañas)
     ================================================================ */
  // Reservas = bloques de alojamiento y vuelo, en el orden del itinerario
  function collectBookings(trip) {
    const out = [];
    trip.days.forEach((day) => day.blocks.forEach((b) => {
      if (b.type === "accommodation" || b.type === "flight") out.push({ block: b, day });
    }));
    return out;
  }
  function bookingTitle(b) {
    if (b.type === "accommodation") return b.name || "Alojamiento sin nombre";
    return (b.from || b.to) ? `${b.from || "?"} → ${b.to || "?"}` : "Vuelo sin ruta";
  }
  function derivedExpenses(trip) {
    return collectBookings(trip)
      .map(({ block }) => ({ label: bookingTitle(block), category: block.type === "flight" ? "Transporte" : "Alojamiento", amount: App.parseAmount(block.price) }))
      .filter((e) => e.amount > 0);
  }
  function budgetTotals(trip) {
    const own = trip.budget.reduce((s, i) => s + App.parseAmount(i.amount), 0);
    const derived = derivedExpenses(trip).reduce((s, e) => s + e.amount, 0);
    const paid = trip.budget.filter((i) => i.paid).reduce((s, i) => s + App.parseAmount(i.amount), 0);
    return { own, derived, total: own + derived, paid, pending: own + derived - paid };
  }
  function routeKm(trip) {
    let km = 0, n = 0;
    trip.days.forEach((d) => d.blocks.forEach((b) => {
      if (b.type !== "gpx") return;
      n++;
      km += b.route ? b.route.distanceKm : App.parseAmount(b.meta && b.meta.distance);
    }));
    return { km, n };
  }

  /* ================================================================
     PESTAÑA: Resumen
     ================================================================ */
  function renderSummary(trip, root) {
    const bookings = collectBookings(trip).length;
    const { km, n } = routeKm(trip);
    const totals = budgetTotals(trip);
    const done = trip.checklist.filter((c) => c.done).length;
    const stat = (tab, value, label) => `<button data-go="${tab}" class="text-left rounded-xl p-4 card-hover" style="background:var(--card); border:1px solid var(--line);"><p class="font-display text-2xl leading-none mb-1.5">${value}</p><p class="text-xs" style="color:var(--muted);">${label}</p></button>`;
    root.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        ${stat("itinerario", trip.days.length, trip.days.length === 1 ? "día" : "días")}
        ${stat("reservas", bookings, bookings === 1 ? "reserva" : "reservas")}
        ${stat("itinerario", n ? `${km.toFixed(1)} km` : "—", n === 1 ? "1 ruta" : `${n} rutas`)}
        ${stat("presupuesto", totals.total ? App.formatMoney(totals.total) : "—", "presupuesto")}
        ${stat("checklist", trip.checklist.length ? `${done}/${trip.checklist.length}` : "—", "checklist")}
      </div>
      <p class="text-sm font-medium mb-2" style="color:var(--muted);">Notas del viaje</p>
      <textarea class="notes field" rows="7" placeholder="Ideas, contactos, enlaces, lo que quieras recordar de este viaje…" style="line-height:1.6;"></textarea>`;
    const notes = root.querySelector(".notes");
    notes.value = trip.notes || "";
    notes.addEventListener("input", () => { trip.notes = notes.value; touch(); });
    root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => App.go(`#/viaje/${trip.id}/${b.dataset.go}`)));
  }

  /* ================================================================
     PESTAÑA: Itinerario (días + bloques + menú "/" + arrastre)
     ================================================================ */
  let dragged = null;       // { blockId }
  let slashDay = null;      // día para el que está abierto el menú "/"

  function renumberDefaultLabels(trip) {
    trip.days.forEach((d, i) => { if (/^Día \d+$/.test(d.label)) d.label = `Día ${i + 1}`; });
  }
  function findBlock(trip, blockId) {
    for (const day of trip.days) { const i = day.blocks.findIndex((b) => b.id === blockId); if (i !== -1) return { day, i }; }
    return null;
  }
  function renderDayBlocks(day) {
    const box = document.getElementById(`blocks-${day.id}`);
    if (!box) return;
    box.innerHTML = "";
    day.blocks.forEach((b) => box.appendChild(App.renderBlock(b)));
  }

  function openSlashMenu(day, anchor) {
    slashDay = day;
    const menu = $("slashMenu");
    const r = anchor.getBoundingClientRect();
    menu.classList.remove("is-hidden");
    const h = menu.offsetHeight || 220;
    const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6;
    menu.style.left = Math.max(8, Math.min(Math.round(r.left), window.innerWidth - 232)) + "px";
    menu.style.top = Math.round(top) + "px";
  }
  function closeSlashMenu() { $("slashMenu").classList.add("is-hidden"); slashDay = null; }
  App.closeSlashMenu = closeSlashMenu;

  function renderDay(trip, day, index) {
    const wrap = document.createElement("div");
    wrap.className = "day flex gap-4 mb-2";
    wrap.dataset.dayId = day.id;
    wrap.innerHTML = `
      <div class="flex flex-col items-center flex-shrink-0">
        <div class="day-dot w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">${index + 1}</div>
        <div class="day-rail flex-1 mt-1"></div>
      </div>
      <div class="flex-1 pb-10 min-w-0">
        <div class="group flex items-baseline gap-2 mb-4">
          <p class="day-label single-line font-display text-lg" contenteditable="true" data-placeholder="Día"></p>
          <span class="day-date single-line text-sm" contenteditable="true" data-placeholder="fecha" style="color:var(--muted);"></span>
          <span class="day-actions ml-auto flex items-center gap-0.5 reveal">
            <button class="day-up icon-btn w-6 h-6 flex items-center justify-center" title="Subir día">${I.up}</button>
            <button class="day-down icon-btn w-6 h-6 flex items-center justify-center" title="Bajar día">${I.down}</button>
            <button class="day-del icon-btn w-6 h-6 flex items-center justify-center" title="Eliminar día">${I.close}</button>
          </span>
        </div>
        <div class="day-blocks" id="blocks-${day.id}" data-day-id="${day.id}"></div>
        <div class="pl-7 pr-7 mt-1"><div class="slash-trigger rounded-lg px-3 py-2 text-sm cursor-text" contenteditable="true" data-placeholder="Escribe '/' para añadir un bloque" style="border:1px dashed var(--line); color:var(--muted);"></div></div>
      </div>`;
    const label = wrap.querySelector(".day-label");
    label.textContent = day.label;
    label.addEventListener("input", () => { day.label = label.textContent; touch(); });
    label.addEventListener("blur", () => { if (!label.textContent.trim()) { day.label = `Día ${trip.days.indexOf(day) + 1}`; label.textContent = day.label; touch(); } });
    const date = wrap.querySelector(".day-date");
    date.textContent = day.date;
    date.addEventListener("input", () => { day.date = date.textContent; touch(); });

    const trigger = wrap.querySelector(".slash-trigger");
    trigger.addEventListener("click", () => openSlashMenu(day, trigger));
    trigger.addEventListener("input", () => { if (trigger.textContent.includes("/")) { trigger.textContent = ""; openSlashMenu(day, trigger); } });
    return wrap;
  }

  function renderItinerary(trip, root) {
    const box = document.createElement("div");
    box.innerHTML = `<div id="timeline"></div><button id="addDayBtn" class="mt-4 text-sm btn-ghost rounded-full px-4 py-2 font-medium">+ Añadir día</button>`;
    root.appendChild(box);
    const timeline = box.querySelector("#timeline");

    const paint = () => {
      timeline.innerHTML = "";
      trip.days.forEach((day, i) => {
        timeline.appendChild(renderDay(trip, day, i));
        renderDayBlocks(day);
      });
    };
    paint();

    box.querySelector("#addDayBtn").addEventListener("click", () => {
      const n = trip.days.length;
      trip.days.push(App.newDay(`Día ${n + 1}`, trip.startDate ? App.formatDayDate(App.addDaysISO(trip.startDate, n)) : ""));
      touch(); paint();
    });

    // Clics delegados: eliminar bloque, mover/eliminar día
    box.addEventListener("click", async (e) => {
      const rm = e.target.closest(".block-remove");
      if (rm) {
        const id = rm.closest(".block").dataset.blockId;
        const f = findBlock(trip, id);
        if (f) { f.day.blocks.splice(f.i, 1); touch(); renderDayBlocks(f.day); }
        return;
      }
      const dayEl = e.target.closest(".day"); if (!dayEl) return;
      const idx = trip.days.findIndex((d) => d.id === dayEl.dataset.dayId); if (idx === -1) return;
      if (e.target.closest(".day-up") && idx > 0) { [trip.days[idx - 1], trip.days[idx]] = [trip.days[idx], trip.days[idx - 1]]; renumberDefaultLabels(trip); touch(); paint(); }
      else if (e.target.closest(".day-down") && idx < trip.days.length - 1) { [trip.days[idx + 1], trip.days[idx]] = [trip.days[idx], trip.days[idx + 1]]; renumberDefaultLabels(trip); touch(); paint(); }
      else if (e.target.closest(".day-del")) {
        const day = trip.days[idx];
        if (trip.days.length === 1) { App.ui.toast("Un viaje necesita al menos un día", "error"); return; }
        if (day.blocks.length) {
          const ok = await App.ui.confirm({ title: `¿Eliminar "${day.label}"?`, text: `Se borrarán sus ${day.blocks.length} bloques. No se puede deshacer.`, okLabel: "Eliminar día", danger: true });
          if (!ok) return;
        }
        trip.days.splice(idx, 1); renumberDefaultLabels(trip); touch(); paint();
      }
    });

    /* ---------- Arrastrar bloques (dentro de un día y entre días) ---------- */
    box.addEventListener("mousedown", (e) => {
      const h = e.target.closest(".drag-handle"); if (h) h.closest(".block").draggable = true;
    });
    box.addEventListener("dragstart", (e) => {
      const b = e.target.closest && e.target.closest(".block");
      if (!b || b.draggable !== true) return;
      dragged = { blockId: b.dataset.blockId };
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", dragged.blockId); } catch (_) {}
      setTimeout(() => b.classList.add("dragging"), 0);
    });
    const clearMarks = () => box.querySelectorAll(".drop-before,.drop-after,.day-drop").forEach((x) => x.classList.remove("drop-before", "drop-after", "day-drop"));
    box.addEventListener("dragend", (e) => {
      const b = e.target.closest && e.target.closest(".block");
      if (b) { b.classList.remove("dragging"); b.draggable = false; }
      clearMarks(); dragged = null;
    });
    box.addEventListener("dragover", (e) => {
      if (!dragged) return;
      const dayBox = e.target.closest(".day-blocks") || (e.target.closest(".day") && e.target.closest(".day").querySelector(".day-blocks"));
      if (!dayBox) return;
      e.preventDefault(); clearMarks();
      const b = e.target.closest(".block");
      if (b && b.dataset.blockId !== dragged.blockId) {
        const r = b.getBoundingClientRect();
        b.classList.add(e.clientY - r.top < r.height / 2 ? "drop-before" : "drop-after");
      } else if (!b) dayBox.classList.add("day-drop");
    });
    box.addEventListener("drop", (e) => {
      if (!dragged) return;
      const dayBox = e.target.closest(".day-blocks") || (e.target.closest(".day") && e.target.closest(".day").querySelector(".day-blocks"));
      if (!dayBox) return;
      e.preventDefault();
      const targetDay = trip.days.find((d) => d.id === dayBox.dataset.dayId);
      const from = findBlock(trip, dragged.blockId);
      if (!targetDay || !from) { dragged = null; return; }
      const overBlock = e.target.closest(".block");
      let before = true, targetId = null;
      if (overBlock && overBlock.dataset.blockId !== dragged.blockId) {
        targetId = overBlock.dataset.blockId;
        before = overBlock.classList.contains("drop-before");
      }
      const [item] = from.day.blocks.splice(from.i, 1);
      let pos = targetDay.blocks.length;
      if (targetId) { pos = targetDay.blocks.findIndex((b) => b.id === targetId); if (!before) pos++; }
      targetDay.blocks.splice(pos, 0, item);
      dragged = null; clearMarks(); touch();
      renderDayBlocks(from.day); if (targetDay !== from.day) renderDayBlocks(targetDay);
    });
  }

  // Menú "/" (un único popover compartido)
  App.initSlashMenu = function () {
    const menu = $("slashMenu");
    menu.innerHTML = App.SLASH_OPTIONS.map((o) => `<button class="menu-item" data-type="${o.type}"><span style="color:var(--moss);">${o.icon}</span>${o.label}</button>`).join("");
    menu.addEventListener("click", (e) => {
      const b = e.target.closest(".menu-item"); if (!b || !slashDay) return;
      const day = slashDay;
      day.blocks.push(App.BLOCK_MAKERS[b.dataset.type]());
      touch(); renderDayBlocks(day); closeSlashMenu();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#slashMenu") && !e.target.closest(".slash-trigger")) closeSlashMenu(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSlashMenu(); });
  };

  /* ================================================================
     PESTAÑA: Reservas (vista agrupada de alojamientos y vuelos)
     ================================================================ */
  function renderBookings(trip, root) {
    const list = collectBookings(trip);
    if (!list.length) {
      root.innerHTML = `<div class="rounded-xl p-8 text-center" style="border:1px dashed var(--line);"><p class="font-display text-lg mb-1">Aún no hay reservas</p><p class="text-sm mb-4" style="color:var(--muted);">Los alojamientos y vuelos que añadas en el itinerario aparecen aquí agrupados.</p><button class="to-itin btn-primary rounded-full px-4 py-2 text-sm font-medium">Ir al itinerario</button></div>`;
      root.querySelector(".to-itin").onclick = () => App.go(`#/viaje/${trip.id}/itinerario`);
      return;
    }
    const row = ({ block: b, day }) => {
      const isFlight = b.type === "flight";
      const detail = isFlight
        ? [b.airline, b.flightNumber, b.departure && `salida ${b.departure}`, b.arrival && `llegada ${b.arrival}`].filter(Boolean).join(" · ")
        : [b.checkIn && `check-in ${b.checkIn}`, b.checkOut && `check-out ${b.checkOut}`, b.address].filter(Boolean).join(" · ");
      const price = App.parseAmount(b.price);
      return `<button data-block="${b.id}" class="w-full text-left rounded-xl p-4 card-hover flex items-start gap-3" style="background:var(--card); border:1px solid var(--line);">
        <span style="color:var(--moss); margin-top:2px;">${isFlight ? I.plane : I.bed}</span>
        <span class="flex-1 min-w-0"><span class="block font-display text-base">${App.esc(bookingTitle(b))}</span><span class="block text-sm" style="color:var(--muted);">${App.esc(detail) || "Sin detalles todavía"}</span></span>
        <span class="text-right text-xs flex-shrink-0" style="color:var(--muted);">${App.esc(day.label)}${day.date ? `<br>${App.esc(day.date)}` : ""}${price ? `<br><span style="color:var(--ink);">${App.formatMoney(price)}</span>` : ""}</span>
      </button>`;
    };
    const group = (title, items) => items.length ? `<p class="text-sm font-medium mb-2 mt-6 first:mt-0" style="color:var(--muted);">${title}</p><div class="space-y-2">${items.map(row).join("")}</div>` : "";
    root.innerHTML = group("Alojamientos", list.filter((x) => x.block.type === "accommodation")) + group("Vuelos", list.filter((x) => x.block.type === "flight")) +
      `<p class="text-xs mt-6" style="color:var(--muted);">Pulsa una reserva para editarla en su día del itinerario.</p>`;
    root.querySelectorAll("[data-block]").forEach((b) => b.addEventListener("click", () => TripView.goToBlock(b.dataset.block)));
  }

  /* ================================================================
     PESTAÑA: Presupuesto
     ================================================================ */
  function renderBudget(trip, root) {
    root.innerHTML = `
      <div class="totals grid grid-cols-3 gap-3 mb-6"></div>
      <div class="by-cat mb-6"></div>
      <div class="derived mb-6"></div>
      <p class="text-sm font-medium mb-2" style="color:var(--muted);">Gastos</p>
      <div class="rows space-y-2"></div>
      <button class="add-row mt-3 text-sm btn-ghost rounded-full px-4 py-2 font-medium">+ Añadir gasto</button>`;
    const totalsEl = root.querySelector(".totals"), catEl = root.querySelector(".by-cat"), derEl = root.querySelector(".derived"), rowsEl = root.querySelector(".rows");

    const paintTotals = () => {
      const t = budgetTotals(trip);
      const card = (v, l, c) => `<div class="rounded-xl p-4" style="background:var(--card); border:1px solid var(--line);"><p class="font-display text-xl leading-none mb-1.5" ${c ? `style="color:${c}"` : ""}>${App.formatMoney(t.total ? v : 0)}</p><p class="text-xs" style="color:var(--muted);">${l}</p></div>`;
      totalsEl.innerHTML = card(t.total, "total") + card(t.paid, "pagado", "var(--moss)") + card(t.pending, "pendiente", "var(--clay)");
      const cats = {};
      trip.budget.forEach((i) => { const a = App.parseAmount(i.amount); if (a) cats[i.category] = (cats[i.category] || 0) + a; });
      derivedExpenses(trip).forEach((e) => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
      const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
      catEl.innerHTML = entries.length ? `<p class="text-sm font-medium mb-2" style="color:var(--muted);">Por categoría</p><div class="space-y-1.5">${entries.map(([c, v]) => `<div class="flex items-center gap-3 text-sm"><span class="w-24 flex-shrink-0">${App.esc(c)}</span><span class="progress flex-1"><span style="width:${Math.round((v / t.total) * 100)}%"></span></span><span class="w-20 text-right flex-shrink-0">${App.formatMoney(v)}</span></div>`).join("")}</div>` : "";
      const der = derivedExpenses(trip);
      derEl.innerHTML = der.length ? `<p class="text-sm font-medium mb-2" style="color:var(--muted);">De las reservas</p><div class="space-y-1">${der.map((e) => `<div class="flex justify-between text-sm rounded-lg px-3 py-2" style="background:var(--card); border:1px solid var(--line);"><span>${App.esc(e.label)} <span style="color:var(--muted);">· ${e.category}</span></span><span>${App.formatMoney(e.amount)}</span></div>`).join("")}</div><p class="text-xs mt-1.5" style="color:var(--muted);">Se calculan solos a partir del precio de cada reserva.</p>` : "";
    };

    const paintRows = () => {
      rowsEl.innerHTML = "";
      if (!trip.budget.length) rowsEl.innerHTML = `<p class="empty text-sm" style="color:var(--muted);">Aún no has añadido gastos.</p>`;
      trip.budget.forEach((item) => {
        const r = document.createElement("div");
        r.className = "row-item flex items-center gap-2";
        r.dataset.id = item.id;
        r.innerHTML = `
          <div class="bud-paid check ${item.paid ? "on" : ""}" role="checkbox" aria-checked="${!!item.paid}" tabindex="0" title="Marcar como pagado">${item.paid ? I.check : ""}</div>
          <input class="bud-concept field flex-1 min-w-0" placeholder="Concepto" value="${App.esc(item.concept)}">
          <select class="bud-category field" style="width:8.5rem;">${App.BUDGET_CATEGORIES.map((c) => `<option ${c === item.category ? "selected" : ""}>${c}</option>`).join("")}</select>
          <input class="bud-amount field text-right" placeholder="0 €" inputmode="decimal" style="width:6rem;" value="${App.esc(item.amount)}">
          <button class="row-remove bud-remove icon-btn w-6 h-6 flex items-center justify-center" title="Eliminar gasto">${I.close}</button>`;
        r.querySelector(".bud-concept").addEventListener("input", (e) => { item.concept = e.target.value; touch(); });
        r.querySelector(".bud-category").addEventListener("change", (e) => { item.category = e.target.value; touch(); paintTotals(); });
        r.querySelector(".bud-amount").addEventListener("input", (e) => { item.amount = e.target.value; touch(); paintTotals(); });
        const check = r.querySelector(".bud-paid");
        const togglePaid = () => { item.paid = !item.paid; check.classList.toggle("on", item.paid); check.innerHTML = item.paid ? I.check : ""; check.setAttribute("aria-checked", item.paid); touch(); paintTotals(); };
        check.addEventListener("click", togglePaid);
        check.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePaid(); } });
        r.querySelector(".bud-remove").addEventListener("click", () => { trip.budget = trip.budget.filter((x) => x.id !== item.id); touch(); paintRows(); paintTotals(); });
        rowsEl.appendChild(r);
      });
    };

    root.querySelector(".add-row").addEventListener("click", () => {
      trip.budget.push(App.newBudgetItem()); touch(); paintRows(); paintTotals();
      const inputs = rowsEl.querySelectorAll(".bud-concept"); inputs[inputs.length - 1].focus();
    });
    paintTotals(); paintRows();
  }

  /* ================================================================
     PESTAÑA: Checklist
     ================================================================ */
  function renderChecklist(trip, root) {
    root.innerHTML = `
      <div class="mb-5"><div class="flex justify-between text-sm mb-1.5"><span class="prog-text" style="color:var(--muted);"></span></div><div class="progress"><span class="prog-bar" style="width:0%"></span></div></div>
      <div class="items space-y-1"></div>
      <div class="flex items-center gap-2 mt-3"><input class="new-item field flex-1" placeholder="Añadir tarea (Enter para guardar)"><button class="add-item btn-ghost rounded-full px-4 py-2 text-sm font-medium">Añadir</button></div>`;
    const itemsEl = root.querySelector(".items");

    const paintProgress = () => {
      const done = trip.checklist.filter((c) => c.done).length, total = trip.checklist.length;
      root.querySelector(".prog-text").textContent = total ? `${done} de ${total} hechas` : "Tu lista está vacía";
      root.querySelector(".prog-bar").style.width = total ? Math.round((done / total) * 100) + "%" : "0%";
    };
    const paint = () => {
      itemsEl.innerHTML = "";
      trip.checklist.forEach((item) => {
        const r = document.createElement("div");
        r.className = "row-item flex items-center gap-3 rounded-lg px-2 py-1.5";
        r.dataset.id = item.id;
        r.innerHTML = `<div class="check ${item.done ? "on" : ""}" role="checkbox" aria-checked="${!!item.done}" tabindex="0">${item.done ? I.check : ""}</div>
          <span class="chk-text single-line flex-1 text-[15px] ${item.done ? "done-text" : ""}" contenteditable="true" data-placeholder="Tarea"></span>
          <button class="row-remove chk-remove icon-btn w-6 h-6 flex items-center justify-center" title="Eliminar">${I.close}</button>`;
        const text = r.querySelector(".chk-text");
        text.textContent = item.text;
        text.addEventListener("input", () => { item.text = text.textContent; touch(); });
        const check = r.querySelector(".check");
        const toggle = () => { item.done = !item.done; check.classList.toggle("on", item.done); check.innerHTML = item.done ? I.check : ""; check.setAttribute("aria-checked", item.done); text.classList.toggle("done-text", item.done); touch(); paintProgress(); };
        check.addEventListener("click", toggle);
        check.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } });
        r.querySelector(".chk-remove").addEventListener("click", () => { trip.checklist = trip.checklist.filter((x) => x.id !== item.id); touch(); paint(); });
        itemsEl.appendChild(r);
      });
      paintProgress();
    };
    const input = root.querySelector(".new-item");
    const add = () => {
      const v = input.value.trim(); if (!v) return;
      trip.checklist.push(App.newCheckItem(v)); input.value = ""; touch(); paint(); input.focus();
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
    root.querySelector(".add-item").addEventListener("click", add);
    paint();
  }
})(window.App);
