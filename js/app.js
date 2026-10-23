/* ================================================================
   app.js — arranque y navegación.
   Rutas (en la URL, para que recargar o usar "atrás" funcione):
     #/                         → Mis viajes
     #/viaje/<id>               → Resumen del viaje
     #/viaje/<id>/<pestaña>     → resumen | itinerario | reservas | presupuesto | checklist
   ================================================================ */
(function (App) {
  const $ = (id) => document.getElementById(id);

  function showView(name) {
    $("dashboardView").classList.toggle("is-hidden", name !== "dashboard");
    $("editorView").classList.toggle("is-hidden", name !== "editor");
  }

  function route() {
    App.closeSlashMenu && App.closeSlashMenu();
    document.querySelectorAll(".ctx-menu").forEach((m) => m.remove());
    const m = (location.hash || "#/").match(/^#\/viaje\/([^/]+)(?:\/([^/]+))?/);
    if (m && App.Store.get(decodeURIComponent(m[1]))) {
      showView("editor");
      App.TripView.show(decodeURIComponent(m[1]), m[2]);
    } else {
      if (m) history.replaceState(null, "", "#/"); // viaje que ya no existe
      showView("dashboard");
      App.Dashboard.render();
      window.scrollTo(0, 0);
    }
  }

  // Navegar: si ya estamos en esa ruta, se vuelve a pintar igualmente
  App.go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

  function init() {
    App.Store.onStatus = App.ui.setSaveStatus;
    App.Store.init();
    App.initSlashMenu();

    // Dashboard
    $("newTripBtn").addEventListener("click", () => App.Dashboard.openNew());
    $("emptyNewBtn").addEventListener("click", () => App.Dashboard.openNew());
    $("backupBtn").addEventListener("click", (e) => { e.stopPropagation(); App.Dashboard.backupMenu(e.currentTarget); });
    $("importInput").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) App.Dashboard.importFile(f); e.target.value = ""; });

    // Modal "Nuevo viaje"
    $("cancelTripBtn").addEventListener("click", () => App.Dashboard.closeNew());
    $("newTripModalBackdrop").addEventListener("click", () => App.Dashboard.closeNew());
    $("createTripBtn").addEventListener("click", () => App.Dashboard.create());
    $("newTripName").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); App.Dashboard.create(); } });
    const tagInput = $("newTripTagInput");
    tagInput.addEventListener("keydown", (e) => {
      const D = App.Dashboard;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const v = tagInput.value.trim().replace(/,$/, "");
        if (v) { D.tags.push(v); tagInput.value = ""; D.paintTags(); }
      } else if (e.key === "Backspace" && !tagInput.value && D.tags.length) { D.tags.pop(); D.paintTags(); }
    });

    // Editor
    $("backToDashboardBtn").addEventListener("click", () => App.go("#/"));
    $("closePointsBtn").addEventListener("click", () => $("pointsPanel").classList.add("is-hidden"));

    // Campos de una sola línea: Enter confirma en vez de meter un salto de línea
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.closest && e.target.closest(".single-line")) { e.preventDefault(); e.target.blur(); }
      if (e.key === "Escape") { App.Dashboard.closeNew(); $("pointsPanel").classList.add("is-hidden"); }
    });
    // Cerrar menús flotantes al hacer clic fuera
    document.addEventListener("click", (e) => { if (!e.target.closest(".ctx-menu")) document.querySelectorAll(".ctx-menu").forEach((m) => m.remove()); });

    // Guardar lo pendiente antes de salir o de ocultar la pestaña
    window.addEventListener("pagehide", () => App.Store.saveNow());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") App.Store.saveNow(); });

    window.addEventListener("hashchange", route);
    route();
  }

  document.addEventListener("DOMContentLoaded", init);
})(window.App);
