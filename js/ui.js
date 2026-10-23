/* ================================================================
   ui.js — piezas reutilizables: iconos, avisos, confirmaciones,
   fechas y etiquetas editables, estado de guardado.
   ================================================================ */
(function (App) {
  const ICONS = {
    close: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>`,
    back: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`,
    pin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>`,
    dots: `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/></svg>`,
    more: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>`,
    up: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg>`,
    down: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`,
    plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5 9-10"/></svg>`,
    bed: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18v-7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 18v3M3 13h18M13 11h5a3 3 0 0 1 3 3v4M21 18v3"/></svg>`,
    plane: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
    route: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 20l5.5-14 4 8 2.5-5L20 20"/></svg>`,
    cloud: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 18a4 4 0 0 0 0-8 5.2 5.2 0 0 0-9.9-1.7A4.3 4.3 0 0 0 6 18h11z"/></svg>`,
    text: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
  };

  const ui = {
    ICONS,

    /* ---------- Aviso breve ---------- */
    toast(msg, kind) {
      const el = document.createElement("div");
      el.className = "toast rounded-full px-4 py-2 text-sm";
      el.style.cssText = `background:${kind === "error" ? "var(--clay)" : "var(--ink)"}; color:#fff; box-shadow:0 8px 24px rgba(0,0,0,.2);`;
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2800);
    },

    /* ---------- Confirmación propia (no usa window.confirm) ---------- */
    confirm({ title, text, okLabel = "Aceptar", danger = false }) {
      return new Promise((resolve) => {
        const wrap = document.createElement("div");
        wrap.className = "overlay";
        wrap.innerHTML = `
          <div class="confirm-bg absolute inset-0" style="background:rgba(0,0,0,.4);"></div>
          <div class="modal-card sm relative bg-white rounded-2xl max-w-sm w-full p-6">
            <p class="font-display text-xl mb-2">${App.esc(title)}</p>
            <p class="text-sm mb-6" style="color:var(--muted);">${App.esc(text || "")}</p>
            <div class="flex justify-end gap-2">
              <button class="confirm-cancel btn-ghost rounded-full px-4 py-2 text-sm font-medium">Cancelar</button>
              <button class="confirm-ok rounded-full px-4 py-2 text-sm font-medium" style="background:${danger ? "var(--clay)" : "var(--moss)"}; color:#fff;">${App.esc(okLabel)}</button>
            </div>
          </div>`;
        const done = (v) => { wrap.remove(); resolve(v); };
        wrap.querySelector(".confirm-cancel").onclick = () => done(false);
        wrap.querySelector(".confirm-bg").onclick = () => done(false);
        wrap.querySelector(".confirm-ok").onclick = () => done(true);
        document.body.appendChild(wrap);
        wrap.querySelector(".confirm-ok").focus();
      });
    },

    /* ---------- Menú contextual pequeño anclado a un botón ---------- */
    // items: [{label, onClick, danger}]
    popMenu(anchor, items) {
      document.querySelectorAll(".ctx-menu").forEach((m) => m.remove());
      const menu = document.createElement("div");
      menu.className = "ctx-menu menu-pop fixed z-[1200] py-1.5 w-48";
      menu.innerHTML = items.map((it, i) => `<button class="menu-item" data-i="${i}" style="${it.danger ? "color:var(--clay);" : ""}">${App.esc(it.label)}</button>`).join("");
      const r = anchor.getBoundingClientRect();
      menu.style.top = Math.round(r.bottom + 4) + "px";
      menu.style.left = Math.max(8, Math.min(window.innerWidth - 200, Math.round(r.right - 192))) + "px";
      menu.addEventListener("click", (e) => {
        const b = e.target.closest(".menu-item"); if (!b) return;
        menu.remove(); items[+b.dataset.i].onClick();
      });
      document.body.appendChild(menu);
    },

    /* ---------- Estado de guardado ---------- */
    setSaveStatus(status) {
      const el = document.getElementById("saveStatus"); if (!el) return;
      el.textContent = status === "saving" ? "Guardando…" : status === "error" ? "No se pudo guardar" : "Guardado";
      el.style.color = status === "error" ? "var(--clay)" : "var(--muted)";
    },

    /* ---------- Fechas editables al clic (tarjeta y cabecera) ---------- */
    renderEditableDates(container, trip, onCommit) {
      container.innerHTML = `<span class="dates-display editable-hint" title="Editar fechas">${App.esc(App.formatDateRange(trip.startDate, trip.endDate))}</span>`;
      container.querySelector(".dates-display").addEventListener("click", (e) => {
        e.stopPropagation();
        container.innerHTML = `
          <input type="date" class="date-start-input text-xs rounded px-1.5 py-1" style="border:1px solid var(--line); color:var(--ink);" value="${App.esc(trip.startDate)}">
          <span>–</span>
          <input type="date" class="date-end-input text-xs rounded px-1.5 py-1" style="border:1px solid var(--line); color:var(--ink);" value="${App.esc(trip.endDate)}">`;
        const s = container.querySelector(".date-start-input"), en = container.querySelector(".date-end-input");
        [s, en].forEach((i) => i.addEventListener("click", (ev) => ev.stopPropagation()));
        // Cada cambio se guarda al momento, pero el editor sigue abierto para poder
        // elegir también la otra fecha; se cierra al salir de los dos campos (o con Enter).
        const save = () => { trip.startDate = s.value; trip.endDate = en.value; App.Store.touch(); };
        s.addEventListener("change", save); en.addEventListener("change", save);
        const close = () => { save(); ui.renderEditableDates(container, trip, onCommit); if (onCommit) onCommit(); };
        container.addEventListener("focusout", (ev) => { if (!ev.relatedTarget || !container.contains(ev.relatedTarget)) setTimeout(() => { if (container.querySelector(".date-start-input") && !container.contains(document.activeElement)) close(); }, 0); });
        container.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); close(); } });
        s.focus();
      });
    },

    /* ---------- Etiquetas de destinos editables ---------- */
    renderEditableTags(container, trip, onChange) {
      container.innerHTML = trip.destinations.map((d, i) =>
        `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style="background:rgba(63,93,69,0.08); color:var(--moss-dark);">${App.esc(d)}<button data-i="${i}" class="tag-remove-btn" title="Quitar destino">${ICONS.close}</button></span>`
      ).join("") + `<input type="text" class="tag-add-input text-xs rounded-full px-2.5 py-1 outline-none" placeholder="+ destino" style="border:1px dashed var(--line); width:84px; background:transparent; color:var(--ink);">`;
      container.onclick = (e) => e.stopPropagation();
      container.querySelectorAll(".tag-remove-btn").forEach((btn) => btn.addEventListener("click", (e) => {
        e.stopPropagation();
        trip.destinations.splice(+btn.dataset.i, 1);
        App.Store.touch();
        ui.renderEditableTags(container, trip, onChange);
        if (onChange) onChange();
      }));
      const input = container.querySelector(".tag-add-input");
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== ",") return;
        e.preventDefault();
        const val = input.value.trim().replace(/,$/, "");
        if (!val) return;
        trip.destinations.push(val);
        App.Store.touch();
        ui.renderEditableTags(container, trip, onChange);
        if (onChange) onChange();
        const n = container.querySelector(".tag-add-input"); if (n) n.focus();
      });
    },
  };

  App.ui = ui;
})(window.App);
