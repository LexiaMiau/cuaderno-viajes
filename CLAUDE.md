# Cuaderno de viaje — contexto para Claude Code

## Qué es
App web de gestión de viajes, estilo "Notion para viajes". La hace Alèxia (diseñadora gráfica, con gusto por el orden y la optimización), así que **el diseño importa tanto como la funcionalidad**. Ya no es un MVP: se va construyendo como app completa, y ella toma las decisiones de estructura.

- Publicada con GitHub Pages: https://lexiamiau.github.io/cuaderno-viajes/
- Repo: `LexiaMiau/cuaderno-viajes`, rama `main`, carpeta raíz.
- Uso previsto: **ella y su pareja** (dos personas editando el mismo viaje) → ver "Fase 2".

## Cómo trabajar con ella
- Responde en **español**, corto y conciso, con bullets cuando ayude.
- Ante decisiones de estructura o producto, **pregunta antes de construir** (opciones claras y una recomendada).
- Entrega por tandas pequeñas y **pruébalas en un navegador real** (Playwright) antes de darlas por buenas. Ya hubo varios bugs que solo se vieron así.
- Si cambias algo visible, dilo en una línea: qué cambió y cómo probarlo.

## Stack y estructura
HTML + CSS + JavaScript vanilla, **sin build ni npm**. Tailwind, Leaflet 1.9.4 y Google Fonts por CDN. Scripts **clásicos** (no módulos ES) para poder abrir `index.html` con doble clic (`file://`); todo cuelga del espacio de nombres global `App`.

```
index.html          estructura base (vistas, modales) y carga de scripts
css/styles.css      estilos propios (todo lo crítico va aquí, no en Tailwind)
js/model.js         ids, fechas, fábricas de datos, parseAmount, cloneTrip
js/gpx.js           lectura de .gpx, estadísticas, mapa Leaflet, perfil de elevación
js/store.js         capa de datos: App.Store + adaptador (hoy localStorage)
js/ui.js            iconos, toast, confirm, popMenu, fechas y etiquetas editables
js/blocks.js        los tipos de bloque (texto, alojamiento, vuelo, plan B, ruta)
js/sample.js        viajes de ejemplo (solo la primera vez; fechas relativas a hoy)
js/trip.js          vista del viaje: cabecera + pestañas + menú "/" + arrastre
js/dashboard.js     "Mis viajes", modal nuevo viaje, duplicar/eliminar, copia de seguridad
js/app.js           arranque, rutas por hash y listeners globales
```
Orden de carga (importa): model → gpx → store → ui → blocks → sample → trip → dashboard → app.

## Navegación (hash en la URL)
`#/` Mis viajes · `#/viaje/<id>` Resumen · `#/viaje/<id>/<pestaña>` con pestaña = `resumen | itinerario | reservas | presupuesto | checklist`. Recargar o usar "atrás" mantiene el sitio. Navegar siempre con `App.go(hash)`.

## Modelo de datos
```js
Trip  { id, title, startDate, endDate (YYYY-MM-DD), destinations[], notes,
        days[], budget[], checklist[], createdAt }
Day   { id, label, date /*texto libre*/, blocks[] }
Block { id, type: "text"|"accommodation"|"flight"|"planb"|"gpx", ...campos }
        accommodation: name, checkIn, checkOut, address, price
        flight:        airline, flightNumber, from, to, departure, arrival, price
        gpx:           route{name,points,distanceKm,gain,loss,durationLabel}, meta{name,distance,gain,loss,duration}, manual
Budget    { id, concept, category, amount, paid }
Checklist { id, text, done }
```
- "Próximo/pasado" se **calcula** con la fecha real de hoy (`App.tripStatus`), no se guarda.
- **Reservas** no son datos propios: es una vista que agrupa los bloques `accommodation` y `flight` del itinerario.
- **Presupuesto** suma los gastos propios + el `price` de las reservas (calculado solo).

## Guardado (`App.Store`)
- Todo cambio llama a `App.Store.touch()` (guarda con retraso de 400 ms). Cualquier campo nuevo editable debe llamarlo.
- Hoy guarda en `localStorage` (clave `cuaderno-viajes:v1`). Los tracks GPX se reducen a 1.500 puntos y se descarta el texto crudo.
- Exportar/importar viajes como `.json` (menú "Copia de seguridad" y menú de cada viaje). Si un id ya existe al importar, se asigna uno nuevo.
- `migrate()` en `store.js` normaliza datos antiguos: **si cambias el esquema, súbele versión y migra**.
- El adaptador (`LocalAdapter`) es lo único que habría que cambiar para guardar en la nube.

## Fase 2 (pendiente, decidida)
Guardar en la nube con **Supabase (plan gratuito, $0/mes)** + cuentas, para que ella y su pareja editen el mismo viaje. Notas:
- El plan gratuito pausa el proyecto tras 1 semana sin actividad → mantener la exportación a archivo como copia de seguridad.
- Necesita: crear proyecto en supabase.com, tablas + Row Level Security, login, y un `SupabaseAdapter` equivalente a `LocalAdapter`. La clave `anon` es pública por diseño; la seguridad va en RLS.
- Decidir con ella: edición simultánea o por turnos, y cómo se invita a la pareja.

## Estética (no romper)
- Fondo crema `#f5f4f0`, tarjetas blancas, bordes finos `#E4E0D4`, sombras solo al interactuar.
- Verde musgo `#3F5D45` (principal), arcilla `#B5652D` (acento). Variables CSS en `:root`.
- Títulos en **Playfair Display** (`.font-display`), interfaz en **Inter**. Minimalista, esquinas suaves.

## Reglas aprendidas (bugs reales ya resueltos)
- **No depender de Tailwind CDN para lo crítico**: mostrar/ocultar usa `.is-hidden`; capas flotantes, modales (`.modal-card`) y controles al pasar el ratón (`.reveal`) están en `styles.css`. Si el CDN falla, la app debe seguir usable. Un fondo de modal sin `position:relative` en su tarjeta bloqueaba todos los clics.
- **Aislar fallos**: cada bloque se renderiza con `try/catch` (`App.renderBlock`), el mapa Leaflet también. Que falle un CDN o un bloque nunca rompe el resto.
- **No poner `contenteditable` dentro de un `<button>`**. Usar `<div>`.
- **Saltos de línea**: campos de varias líneas (texto, Plan B) se leen con `innerText` y llevan `.multiline`; con `textContent` se perdían al recargar. Las notas del Resumen usan `<textarea>`.
- Campos de una línea llevan `.single-line` (Enter confirma).
- Editor de fechas: no se cierra al elegir solo el inicio; se cierra al salir de los dos campos o con Enter.
- Datos del usuario siempre con `App.esc()` al meterlos en `innerHTML`.
- Un solo listener global delegado para cerrar menús, no uno por elemento.
- `confirm`/`alert` del navegador no se usan: `App.ui.confirm` (bloquearía las pruebas automáticas).

## Cómo probar
Abrir `index.html` (necesita internet para los CDN) o servir la carpeta. Con Playwright cargar `file:///…/index.html`; sin internet los CDN fallan y la app debe seguir funcionando (el mapa muestra un mensaje de respaldo). Checklist mínimo tras cada cambio: crear viaje (con y sin fechas), editar nombre/fechas/destinos en tarjeta y en viaje, recorrer las 5 pestañas, añadir cada bloque con "/", mover bloques entre días, subir un `.gpx`, presupuesto y checklist, **recargar y comprobar que todo persiste**, exportar/importar, duplicar y eliminar.

## Roadmap (por orden; pendiente de que Alèxia lo reordene)
1. Pestaña **Mapa**: rutas GPX y alojamientos en un solo mapa.
2. Portada propia por viaje (subir imagen).
3. Más tipos de bloque: enlaces/reservas con archivo, actividades con hora, transporte local.
4. Reordenar bloques en móvil (el arrastre HTML5 no funciona con el dedo).
5. Fase 2: nube con Supabase y pareja.

## Git
- Commits en español, descriptivos. `main`; Pages se despliega sola al hacer push.
- No subir archivos de prueba ni capturas.
