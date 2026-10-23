/* ================================================================
   blocks.js — los tipos de bloque que se pueden poner dentro de un día.
   Para añadir un tipo nuevo: fábrica en model.js (BLOCK_MAKERS),
   renderizador aquí (RENDERERS) y entrada en SLASH_OPTIONS.
   ================================================================ */
(function (App) {
  const I = App.ui.ICONS;
  const touch = () => App.Store.touch();

  // Enlaza un elemento editable con un campo del objeto de datos
  // multiline: conserva los saltos de línea (innerText) en lugar de perderlos (textContent)
  function bind(el, obj, key, multiline) {
    el.textContent = obj[key] ?? "";
    if (multiline) el.classList.add("multiline");
    el.addEventListener("input", () => { obj[key] = multiline ? el.innerText.replace(/\n$/, "") : el.textContent; touch(); });
  }

  function wrapper(block, inner) {
    const wrap = document.createElement("div");
    wrap.className = "block group relative mb-3 pl-7 pr-7";
    wrap.dataset.blockId = block.id;
    wrap.innerHTML = `
      <button class="drag-handle absolute left-0 top-1.5 reveal w-6 h-6 flex items-center justify-center cursor-grab" style="color:var(--muted);" title="Arrastrar para mover">${I.dots}</button>
      <button class="block-remove reveal absolute right-0 top-1.5 z-10 w-6 h-6 flex items-center justify-center icon-btn" title="Eliminar bloque">${I.close}</button>
      ${inner}`;
    return wrap;
  }

  /* ---------- Texto ---------- */
  function renderText(block) {
    const el = wrapper(block, `<div class="text-[15px] leading-relaxed" contenteditable="true" data-placeholder="Escribe algo sobre este día…"></div>`);
    bind(el.querySelector("[contenteditable]"), block, "content", true);
    return el;
  }

  /* ---------- Alojamiento ---------- */
  function renderAccommodation(block) {
    const el = wrapper(block, `
      <div class="rounded-xl p-4" style="border:1px solid var(--line); background:var(--card);">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs mb-1" style="color:var(--muted);">Alojamiento</p>
            <p class="f-name font-display text-lg mb-2" contenteditable="true" data-placeholder="Nombre del hotel / camping"></p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm" style="color:var(--muted);">
              <span>Check-in <span class="f-in" contenteditable="true" data-placeholder="--:--" style="color:var(--ink);"></span></span>
              <span>Check-out <span class="f-out" contenteditable="true" data-placeholder="--:--" style="color:var(--ink);"></span></span>
              <span>Precio <span class="f-price single-line" contenteditable="true" data-placeholder="0 €" style="color:var(--ink);"></span></span>
            </div>
            <p class="f-addr text-sm mt-2" contenteditable="true" data-placeholder="Dirección o zona" style="color:var(--muted);"></p>
          </div>
          <button class="maps-btn icon-btn w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style="border:1px solid var(--line);" title="Abrir en Google Maps">${I.pin}</button>
        </div>
      </div>`);
    bind(el.querySelector(".f-name"), block, "name");
    bind(el.querySelector(".f-in"), block, "checkIn");
    bind(el.querySelector(".f-out"), block, "checkOut");
    bind(el.querySelector(".f-price"), block, "price");
    bind(el.querySelector(".f-addr"), block, "address");
    el.querySelector(".maps-btn").addEventListener("click", () => {
      const q = (block.address || block.name || "").trim();
      if (q) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, "_blank");
    });
    return el;
  }

  /* ---------- Vuelo ---------- */
  function renderFlight(block) {
    const el = wrapper(block, `
      <div class="rounded-xl p-4" style="border:1px solid var(--line); background:var(--card);">
        <p class="text-xs mb-2" style="color:var(--muted);">Vuelo</p>
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex-1 min-w-[10rem]">
            <p class="font-display text-lg leading-none mb-1">
              <span class="f-from" contenteditable="true" data-placeholder="BCN"></span>
              <span class="mx-1" style="color:var(--muted);">→</span>
              <span class="f-to" contenteditable="true" data-placeholder="ARN"></span>
            </p>
            <p class="text-sm" style="color:var(--muted);">
              <span class="f-airline" contenteditable="true" data-placeholder="Aerolínea"></span> ·
              <span class="f-num" contenteditable="true" data-placeholder="Nº vuelo"></span>
            </p>
          </div>
          <div class="text-sm text-right" style="color:var(--muted);">
            <p>Salida <span class="f-dep" contenteditable="true" data-placeholder="--:--" style="color:var(--ink);"></span></p>
            <p>Llegada <span class="f-arr" contenteditable="true" data-placeholder="--:--" style="color:var(--ink);"></span></p>
            <p>Precio <span class="f-price single-line" contenteditable="true" data-placeholder="0 €" style="color:var(--ink);"></span></p>
          </div>
        </div>
      </div>`);
    [[".f-from", "from"], [".f-to", "to"], [".f-airline", "airline"], [".f-num", "flightNumber"], [".f-dep", "departure"], [".f-arr", "arrival"], [".f-price", "price"]]
      .forEach(([sel, key]) => bind(el.querySelector(sel), block, key));
    return el;
  }

  /* ---------- Plan B / Clima (desplegable) ---------- */
  function renderPlanB(block) {
    const el = wrapper(block, `
      <div class="rounded-xl" style="border:1px solid var(--line); background:var(--card);">
        <div class="toggle-btn w-full flex items-center gap-2 p-4 text-left cursor-pointer select-none">
          <span class="toggle-chevron icon-btn flex-shrink-0">${I.chevron}</span>
          <span class="f-title font-display text-base select-text cursor-text" contenteditable="true" data-placeholder="Plan B / Clima"></span>
        </div>
        <div class="f-content px-4 pb-4 text-sm leading-relaxed" contenteditable="true" data-placeholder="Alternativa si llueve o cambia el plan…" style="color:var(--muted);"></div>
      </div>`);
    const content = el.querySelector(".f-content"), chevron = el.querySelector(".toggle-chevron");
    bind(el.querySelector(".f-title"), block, "title");
    bind(content, block, "content", true);
    const sync = () => { content.classList.toggle("is-hidden", !block.open); chevron.classList.toggle("open", !!block.open); };
    sync();
    el.querySelector(".toggle-btn").addEventListener("click", (e) => {
      if (e.target.closest(".f-title")) return; // clicar el título solo edita
      block.open = !block.open; sync(); touch();
    });
    return el;
  }

  /* ---------- Ruta (GPX) ---------- */
  function readGPXFile(file, block, container, errorEl) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { App.attachGPXToBlock(block, App.parseGPX(ev.target.result)); touch(); mountGPX(container, block); }
      catch (err) { errorEl.textContent = err.message; errorEl.classList.remove("is-hidden"); }
    };
    reader.readAsText(file);
  }

  function openPointsPanel(route) {
    document.getElementById("pointsList").innerHTML = route.points.map((p, i) =>
      `<div>${i + 1}. lat ${p.lat.toFixed(5)}, lon ${p.lon.toFixed(5)}${p.ele != null ? `, ele ${Number(p.ele).toFixed(0)}m` : ""}</div>`).join("");
    document.getElementById("pointsPanel").classList.remove("is-hidden");
  }

  function mountGPX(container, block) {
    App.ensureRoute(block);
    // Estado vacío: subir un .gpx o rellenar a mano
    if (!block.route && !block.manual) {
      container.innerHTML = `
        <div class="dropzone rounded-xl border-2 border-dashed p-6 text-center" style="border-color:var(--line);">
          <p class="text-sm mb-3" style="color:var(--muted);">Añade el .gpx de esta etapa (Wikiloc) o rellénala a mano</p>
          <div class="flex items-center justify-center gap-2 flex-wrap">
            <label class="btn-primary inline-block rounded-full px-4 py-2 text-sm font-medium cursor-pointer">Seleccionar archivo .gpx<input type="file" accept=".gpx" class="is-hidden gpx-file-input" /></label>
            <button type="button" class="manual-btn btn-ghost rounded-full px-4 py-2 text-sm font-medium">Rellenar a mano</button>
          </div>
          <p class="gpx-error text-xs mt-3 is-hidden" style="color:var(--clay);"></p>
        </div>`;
      const dz = container.querySelector(".dropzone"), input = container.querySelector(".gpx-file-input"), err = container.querySelector(".gpx-error");
      input.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) readGPXFile(f, block, container, err); });
      ["dragover", "dragleave", "drop"].forEach((evt) => dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.toggle("dragover", evt === "dragover"); }));
      dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) readGPXFile(f, block, container, err); });
      container.querySelector(".manual-btn").addEventListener("click", () => { block.manual = true; touch(); mountGPX(container, block); });
      return;
    }
    const hasRoute = !!block.route;
    container.innerHTML = `
      <div class="rounded-xl overflow-hidden" style="border:1px solid var(--line); background:var(--card);">
        ${hasRoute ? `<div id="map-${block.id}" style="height:220px; background:#e9e6db;"></div><svg id="elev-${block.id}" viewBox="0 0 600 60" preserveAspectRatio="none" style="height:48px; width:100%; display:block;"></svg>` : ""}
        <div class="p-4">
          <p class="f-name single-line font-display text-base mb-3" contenteditable="true" data-placeholder="Nombre de la ruta"></p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div><p class="f-distance single-line stat-value font-display text-lg leading-none" contenteditable="true" data-placeholder="0 km"></p><p class="text-xs mt-1" style="color:var(--muted);">distancia</p></div>
            <div><p class="f-gain single-line stat-value font-display text-lg leading-none" contenteditable="true" data-placeholder="+0 m" style="color:var(--moss);"></p><p class="text-xs mt-1" style="color:var(--muted);">desnivel +</p></div>
            <div><p class="f-loss single-line stat-value font-display text-lg leading-none" contenteditable="true" data-placeholder="−0 m" style="color:var(--clay);"></p><p class="text-xs mt-1" style="color:var(--muted);">desnivel −</p></div>
            <div><p class="f-duration single-line stat-value font-display text-lg leading-none" contenteditable="true" data-placeholder="0h 00min"></p><p class="text-xs mt-1" style="color:var(--muted);">duración</p></div>
          </div>
          <div class="flex gap-2">
            ${hasRoute
              ? `<button class="view-points-btn btn-ghost rounded-full px-3 py-1.5 text-xs font-medium flex-1">Ver puntos</button><button class="download-points-btn btn-primary rounded-full px-3 py-1.5 text-xs font-medium flex-1">Descargar JSON</button>`
              : `<label class="btn-ghost rounded-full px-3 py-1.5 text-xs font-medium flex-1 text-center cursor-pointer">Añadir .gpx para ver el mapa<input type="file" accept=".gpx" class="is-hidden gpx-file-input" /></label>`}
          </div>
          <p class="gpx-error text-xs mt-3 is-hidden" style="color:var(--clay);"></p>
        </div>
      </div>`;
    [[".f-name", "name"], [".f-distance", "distance"], [".f-gain", "gain"], [".f-loss", "loss"], [".f-duration", "duration"]]
      .forEach(([sel, key]) => bind(container.querySelector(sel), block.meta, key));
    if (hasRoute) {
      App.renderGPXVisuals(block, block.route);
      container.querySelector(".view-points-btn").addEventListener("click", () => openPointsPanel(block.route));
      container.querySelector(".download-points-btn").addEventListener("click", () => App.downloadRoutePoints(block.route, block.meta.name));
    } else {
      const input = container.querySelector(".gpx-file-input"), err = container.querySelector(".gpx-error");
      input.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) readGPXFile(f, block, container, err); });
    }
  }

  function renderGPX(block) {
    const el = wrapper(block, `<div class="gpx-slot"></div>`);
    mountGPX(el.querySelector(".gpx-slot"), block);
    return el;
  }

  const RENDERERS = { text: renderText, accommodation: renderAccommodation, flight: renderFlight, planb: renderPlanB, gpx: renderGPX };

  // Renderiza un bloque aislando los fallos: si uno falla, el resto del día sigue funcionando
  App.renderBlock = function (block) {
    try { return RENDERERS[block.type](block); }
    catch (err) {
      console.warn("Error renderizando bloque", block.type, err);
      const f = document.createElement("div");
      f.className = "block mb-3 ml-7 mr-7 rounded-xl p-4 text-sm";
      f.dataset.blockId = block.id;
      f.style.cssText = "border:1px solid var(--line); color:var(--clay);";
      f.textContent = `No se ha podido mostrar este bloque (${err.message}).`;
      return f;
    }
  };

  App.SLASH_OPTIONS = [
    { type: "accommodation", label: "Alojamiento", icon: I.bed },
    { type: "flight", label: "Vuelo", icon: I.plane },
    { type: "gpx", label: "Ruta (GPX)", icon: I.route },
    { type: "planb", label: "Plan B", icon: I.cloud },
    { type: "text", label: "Texto", icon: I.text },
  ];
})(window.App);
