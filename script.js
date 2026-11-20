
// --------------------------------------
// Friseursalon – Online-Terminbuchung
// --------------------------------------

// Preise und Dauer der angebotenen Leistungen
const services = {
  cut: { name: "Haarschnitt", duration: 60, price: 65 },
  blowout: { name: "Waschen & Föhnen", duration: 45, price: 40 },
  color: { name: "Coloration", duration: 120, price: 145 },
  balayage: { name: "Balayage", duration: 180, price: 220 },
  care: { name: "Pflegebehandlung", duration: 45, price: 55 },
  event: { name: "Event-Styling", duration: 75, price: 85 }
};

// Einstellungen für die Öffnungszeiten
const OPENING_HOUR = 9;
const CLOSING_HOUR = 18;
const SLOT_INTERVAL = 30;
const CLOSED_DAYS = [0]; // Sonntag

// Gespeicherte Termine
const STORAGE_KEY = "friseurManagementAppointments";

let appointments = loadAppointments();
let selectedDate = null;
let selectedTime = null;
let currentMonth = new Date();

const serviceSelect = document.getElementById("service");
const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
const timeSlots = document.getElementById("timeSlots");
const bookingForm = document.getElementById("bookingForm");
const appointmentList = document.getElementById("appointmentList");
const message = document.getElementById("message");

// Datum im Format YYYY-MM-DD
function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Datum für die Anzeige formatieren
function formatDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

// HTML-Sonderzeichen sicher behandeln
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

// Termine aus dem Browser laden
function loadAppointments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Termine konnten nicht geladen werden:", error);
    return [];
  }
}

// Termine im Browser speichern
function saveAppointments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
  } catch (error) {
    showMessage("Die Termine konnten nicht gespeichert werden.", "error");
  }
}

// Meldungen anzeigen
function showMessage(text, type = "success") {
  message.textContent = text;
  message.className = `message ${type}`;
}

// Gewählte Leistung ermitteln
function getSelectedService() {
  return services[serviceSelect.value];
}

// Uhrzeit in Minuten umrechnen
function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Prüfen, ob sich zwei Termine überschneiden
function hasConflict(date, startTime, duration) {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + duration;

  return appointments.some(appointment => {
    if (appointment.date !== date) return false;

    const existingStart = timeToMinutes(appointment.time);
    const existingEnd = existingStart + appointment.duration;

    return newStart < existingEnd && newEnd > existingStart;
  });
}

// Kalender anzeigen
function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  monthYear.textContent = currentMonth.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Montag als ersten Wochentag verwenden
  const startOffset = (firstDay.getDay() + 6) % 7;

  const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  let calendarHTML = weekdays
    .map(day => `<span class="weekday">${day}</span>`)
    .join("");

  // Leere Felder vor dem ersten Monatstag
  for (let i = 0; i < startOffset; i++) {
    calendarHTML += `<span class="empty-day"></span>`;
  }

  const today = getDateKey(new Date());

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = getDateKey(date);

    const isPast = dateKey < today;
    const isClosed = CLOSED_DAYS.includes(date.getDay());
    const isSelected = dateKey === selectedDate;

    const disabled = isPast || isClosed;

    calendarHTML += `
      <button
        type="button"
        class="calendar-day ${isSelected ? "selected" : ""}"
        data-date="${dateKey}"
        ${disabled ? "disabled" : ""}
        aria-label="${formatDate(dateKey)}"
      >
        ${day}
      </button>
    `;
  }

  calendar.innerHTML = calendarHTML;
}

// Freie Uhrzeiten ermitteln
function renderTimeSlots() {
  selectedTime = null;

  if (!selectedDate) {
    timeSlots.innerHTML = "<p>Bitte wähle zuerst einen Tag aus.</p>";
    return;
  }

  const service = getSelectedService();

  if (!service) {
    timeSlots.innerHTML = "<p>Bitte wähle zuerst eine Leistung aus.</p>";
    return;
  }

  const today = getDateKey(new Date());
  const now = new Date();
  const availableTimes = [];

  for (
    let minutes = OPENING_HOUR * 60;
    minutes + service.duration <= CLOSING_HOUR * 60;
    minutes += SLOT_INTERVAL
  ) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    const time = `${hours}:${mins}`;

    // Vergangene Uhrzeiten am heutigen Tag überspringen
    if (
      selectedDate === today &&
      minutes <= now.getHours() * 60 + now.getMinutes()
    ) {
      continue;
    }

    if (!hasConflict(selectedDate, time, service.duration)) {
      availableTimes.push(time);
    }
  }

  if (availableTimes.length === 0) {
    timeSlots.innerHTML =
      "<p>Für diesen Tag sind leider keine passenden Termine frei.</p>";
    return;
  }

  timeSlots.innerHTML = availableTimes
    .map(time => `
      <button
        type="button"
        class="time-slot"
        data-time="${time}"
      >
        ${time} Uhr
      </button>
    `)
    .join("");
}

// Terminliste anzeigen
function renderAppointments() {
  if (appointments.length === 0) {
    appointmentList.innerHTML = "<p>Noch keine Termine gebucht.</p>";
    return;
  }

  const sortedAppointments = [...appointments].sort((a, b) => {
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  });

  appointmentList.innerHTML = sortedAppointments.map(appointment => `
    <div class="appointment">
      <div class="appointment-details">
        <h3>${escapeHTML(appointment.serviceName)}</h3>
        <p>${escapeHTML(appointment.name)}</p>
        <p>${formatDate(appointment.date)} – ${escapeHTML(appointment.time)} Uhr</p>
        <p>${appointment.duration} Minuten · ${appointment.price} €</p>
      </div>

      <button
        type="button"
        class="cancel-button"
        data-id="${escapeHTML(appointment.id)}"
      >
        Stornieren
      </button>
    </div>
  `).join("");
}

// Kalenderdatum auswählen
calendar.addEventListener("click", event => {
  const button = event.target.closest("[data-date]");

  if (!button || button.disabled) return;

  selectedDate = button.dataset.date;

  renderCalendar();
  renderTimeSlots();
  message.textContent = "";
});

// Uhrzeit auswählen
timeSlots.addEventListener("click", event => {
  const button = event.target.closest("[data-time]");

  if (!button) return;

  selectedTime = button.dataset.time;

  document.querySelectorAll(".time-slot").forEach(slot => {
    slot.classList.remove("selected");
  });

  button.classList.add("selected");
});

// Leistung ändern
serviceSelect.addEventListener("change", () => {
  renderTimeSlots();
});

// Zum vorherigen Monat wechseln
document.getElementById("prevMonth").addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );

  selectedDate = null;
  renderCalendar();
  renderTimeSlots();
});

// Zum nächsten Monat wechseln
document.getElementById("nextMonth").addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1
  );

  selectedDate = null;
  renderCalendar();
  renderTimeSlots();
});

// Buchungsformular absenden
bookingForm.addEventListener("submit", event => {
  event.preventDefault();

  if (!bookingForm.reportValidity()) return;

  const service = getSelectedService();

  if (!selectedDate || !selectedTime || !service) {
    showMessage("Bitte wähle eine Leistung, einen Tag und eine Uhrzeit.", "error");
    return;
  }

  // Prüfen, ob der Termin inzwischen belegt wurde
  if (hasConflict(selectedDate, selectedTime, service.duration)) {
    showMessage("Diese Uhrzeit ist leider nicht mehr verfügbar.", "error");
    renderTimeSlots();
    return;
  }

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const appointment = {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    email,
    phone,
    service: serviceSelect.value,
    serviceName: service.name,
    duration: service.duration,
    price: service.price,
    date: selectedDate,
    time: selectedTime
  };

  appointments.push(appointment);
  saveAppointments();

  bookingForm.reset();
  selectedDate = null;
  selectedTime = null;

  showMessage("Dein Termin wurde erfolgreich gebucht.", "success");

  renderCalendar();
  renderTimeSlots();
  renderAppointments();
});

// Termin stornieren
appointmentList.addEventListener("click", event => {
  const button = event.target.closest("[data-id]");

  if (!button) return;

  const appointmentId = button.dataset.id;

  if (!confirm("Möchtest du diesen Termin wirklich stornieren?")) {
    return;
  }

  appointments = appointments.filter(
    appointment => appointment.id !== appointmentId
  );

  saveAppointments();
  renderAppointments();
  renderTimeSlots();

  showMessage("Der Termin wurde storniert.", "success");
});

// Kalender beim Laden der Seite initialisieren
renderCalendar();
renderTimeSlots();
renderAppointments();
