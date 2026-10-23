/* ================================================================
   sample.js — viajes de ejemplo que se cargan solo la primera vez.
   Las fechas son relativas a hoy para que siempre haya "próximos" y "pasados".
   ================================================================ */
(function (App) {
  const GPX_MONTREBEI = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ejemplo" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Congost de Mont-rebei</name></metadata>
<trk><name>Congost de Mont-rebei</name><trkseg>
<trkpt lat="42.0210" lon="0.6790"><ele>430</ele><time>2026-07-12T08:00:00Z</time></trkpt>
<trkpt lat="42.0268" lon="0.6860"><ele>470</ele><time>2026-07-12T08:17:00Z</time></trkpt>
<trkpt lat="42.0325" lon="0.6945"><ele>560</ele><time>2026-07-12T08:38:00Z</time></trkpt>
<trkpt lat="42.0345" lon="0.7060"><ele>625</ele><time>2026-07-12T08:58:00Z</time></trkpt>
<trkpt lat="42.0300" lon="0.7150"><ele>560</ele><time>2026-07-12T09:16:00Z</time></trkpt>
<trkpt lat="42.0230" lon="0.7150"><ele>470</ele><time>2026-07-12T09:34:00Z</time></trkpt>
<trkpt lat="42.0210" lon="0.6790"><ele>430</ele><time>2026-07-12T09:55:00Z</time></trkpt>
</trkseg></trk></gpx>`;

  const GPX_VALLDARAN = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ejemplo" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Pujada al Pic de Salardú</name></metadata>
<trk><name>Pujada al Pic de Salardú</name><trkseg>
<trkpt lat="42.6890" lon="0.8460"><ele>1270</ele><time>2026-07-13T07:30:00Z</time></trkpt>
<trkpt lat="42.6995" lon="0.8590"><ele>1560</ele><time>2026-07-13T08:10:00Z</time></trkpt>
<trkpt lat="42.7080" lon="0.8735"><ele>1900</ele><time>2026-07-13T08:56:00Z</time></trkpt>
<trkpt lat="42.6995" lon="0.8710"><ele>1550</ele><time>2026-07-13T09:38:00Z</time></trkpt>
<trkpt lat="42.6890" lon="0.8460"><ele>1270</ele><time>2026-07-13T10:20:00Z</time></trkpt>
</trkseg></trk></gpx>`;

  App.sampleTrips = function () {
    const today = App.todayISO();
    const at = (n) => App.addDaysISO(today, n);
    const dayLabel = (iso) => App.formatDayDate(iso);

    // 1) Pirineos — próximo
    const t1 = App.newTrip({ title: "Ruta Prepirineu i Pirineu Català", startDate: at(21), endDate: at(22), destinations: ["Mont-rebei", "Vall d'Aran"] });
    t1.days[0].blocks = [
      App.newTextBlock("Salimos hacia el Congost de Mont-rebei, uno de los cañones fluviales mejor conservados de Catalunya."),
      App.newGPXBlock(GPX_MONTREBEI),
      App.newAccommodationBlock({ name: "Casa rural El Mirador", checkIn: "17:00", checkOut: "10:00", address: "Sant Esteve de la Sarga, Lleida", price: 85 }),
      App.newPlanBBlock({ title: "Plan B / Clima", content: "Con tormenta, sustituir por la visita al Centre d'Interpretació de Mont-rebei." }),
    ];
    t1.days[1].blocks = [
      App.newTextBlock("Segunda etapa hacia la Vall d'Aran, con ascensión matinal al Pic de Salardú."),
      App.newGPXBlock(GPX_VALLDARAN),
      App.newAccommodationBlock({ name: "Refugi de muntanya Aiguamòg", checkIn: "16:00", checkOut: "09:30", address: "Salardú, Val d'Aran", price: 60 }),
    ];
    t1.budget = [
      App.newBudgetItem({ concept: "Gasolina ida y vuelta", category: "Transporte", amount: 70, paid: false }),
      App.newBudgetItem({ concept: "Comidas", category: "Comida", amount: 90, paid: false }),
    ];
    t1.checklist = ["Botas de montaña", "Chubasquero", "Cargar GPX en el móvil", "Reservar refugio"].map((t, i) => App.newCheckItem(t, i === 3));

    // 2) Escandinavia — próximo
    const t2 = App.newTrip({ title: "Fiordos nórdicos", startDate: at(60), endDate: at(64), destinations: ["Estocolmo", "Oslo"] });
    t2.days[0].blocks = [
      App.newTextBlock("Llegada a Estocolmo, tarde libre para pasear por Gamla Stan."),
      App.newFlightBlock({ airline: "SAS", flightNumber: "SK1547", from: "BCN", to: "ARN", departure: "09:15", arrival: "12:40", price: 189 }),
      App.newAccommodationBlock({ name: "Hotel Skeppsholmen", checkIn: "15:00", checkOut: "11:00", address: "Gröna gången 1, Estocolmo", price: 420 }),
    ];
    t2.days[1].blocks = [
      App.newTextBlock("Museo Vasa por la mañana, tren hacia Oslo por la tarde."),
      App.newPlanBBlock({ title: "Plan B / Clima", content: "Con lluvia intensa, cambiar el paseo por el casco antiguo por el Fotografiska." }),
    ];
    t2.checklist = ["Pasaporte / DNI", "Adaptador de enchufe", "Seguro de viaje"].map((t) => App.newCheckItem(t));

    // 3) Costa Brava — pasado
    const t3 = App.newTrip({ title: "Costa Brava en bici", startDate: at(-150), endDate: at(-148), destinations: ["Begur", "Cadaqués"] });
    t3.days[0].blocks = [
      App.newTextBlock("Ruta costera entre calas, parando a comer en Aiguablava."),
      App.newAccommodationBlock({ name: "Hostal Sa Riera", checkIn: "16:00", checkOut: "10:00", address: "Begur, Girona", price: 95 }),
    ];
    t3.days[0].date = dayLabel(at(-150));

    return [t1, t2, t3];
  };
})(window.App);
