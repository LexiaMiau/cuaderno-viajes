# Cuaderno de viaje

App web para organizar viajes, estilo "Notion para viajes".

**Ver online:** https://lexiamiau.github.io/cuaderno-viajes/

## Qué hace
- **Mis viajes:** tarjetas separadas en próximos y pasados; crear, duplicar y eliminar.
- **Dentro de cada viaje, cinco pestañas:**
  - **Resumen:** cifras clave y notas.
  - **Itinerario:** días con bloques (texto, alojamiento, vuelo, ruta GPX de Wikiloc y Plan B). Se añaden con `/`, se reordenan arrastrando y se pueden pasar de un día a otro.
  - **Reservas:** alojamientos y vuelos agrupados.
  - **Presupuesto:** gastos, pagado/pendiente y totales por categoría.
  - **Checklist:** tareas con progreso.
- **Se guarda solo** en el navegador. Copia de seguridad: exportar e importar viajes como archivo.

## En local
Abre `index.html` en el navegador (necesita internet para cargar Tailwind, Leaflet y las tipografías). No hay nada que instalar.

## Estructura
`index.html` · `css/styles.css` · `js/` (model, gpx, store, ui, blocks, sample, trip, dashboard, app). Más detalle en `CLAUDE.md`.
