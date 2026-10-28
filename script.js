/*
  SB Salon booking app
  Replace the publishable key below with your Supabase sb_publishable_... key.
  Never put a Supabase secret/service_role key in browser code.
*/
const SUPABASE_URL = "https://uhcvntujsqptimoccgpt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MmrHK3YZKl4IXXR7PY0JDQ_i3Xhf2iV";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const CONFIG = {
  salonName: "SB Salon",
  // Add the salon's WhatsApp number with country code and digits only, e.g. 919876543210.
  // Leave empty until the correct number is known. Booking still saves without WhatsApp redirection.
  whatsappNumber: "916280039604",
  // These are demo slot times. Update them to match the salon's real opening hours.
  slotTimes: ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"]
};

const $ = (selector) => document.querySelector(selector);
const state = {
  services: [],
  selectedServiceIds: new Set(),
  selectedTime: "",
  bookedTimes: new Set(),
  adminAppointments: [],
  adminUser: null
};

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(value) || 0);

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prettyDate(dateString) {
  if (!dateString) return "Not selected";
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function prettyTime(timeString) {
  if (!timeString) return "Not selected";
  const [hour, minute] = timeString.slice(0, 5).split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

function getSelectedServices() {
  return state.services.filter(service => state.selectedServiceIds.has(service.id));
}

function selectedTotal() {
  return getSelectedServices().reduce((total, service) => total + Number(service.price || 0), 0);
}

function renderServiceCards() {
  const grid = $("#serviceGrid");
  if (!state.services.length) {
    grid.innerHTML = '<div class="loading-card">No active services are available yet. Please check back soon.</div>';
    return;
  }
  grid.innerHTML = state.services.map((service, index) => `
    <article class="service-card">
      <span class="service-number">${String(index + 1).padStart(2, "0")} / SB SERVICE</span>
      <h3>${escapeHtml(service.name)}</h3>
      <p>${escapeHtml(service.description || "A personalised salon service, tailored to you.")}</p>
      <div class="service-card-bottom"><strong>${money(service.price)}</strong><span>${Number(service.duration_minutes) || 0} min</span></div>
    </article>`).join("");
}

function renderServicePicker() {
  const picker = $("#servicePicker");
  if (!state.services.length) {
    picker.innerHTML = '<p class="muted">No active services are available. Please contact the salon.</p>';
    return;
  }
  picker.innerHTML = state.services.map(service => `
    <label class="service-option">
      <input type="checkbox" value="${escapeHtml(service.id)}" data-service-id="${escapeHtml(service.id)}" ${state.selectedServiceIds.has(service.id) ? "checked" : ""}>
      <span class="service-option-copy"><strong>${escapeHtml(service.name)}</strong><small>${Number(service.duration_minutes) || 0} min</small></span>
      <span class="service-option-price">${money(service.price)}</span>
    </label>`).join("");
}

function renderSummary() {
  const services = getSelectedServices();
  $("#summaryServiceCount").textContent = services.length ? `${services.length} selected` : "None selected";
  $("#summaryServices").innerHTML = services.length
    ? services.map(service => `<div class="summary-service"><span>${escapeHtml(service.name)}</span><strong>${money(service.price)}</strong></div>`).join("")
    : '<p class="muted">Your selected services will appear here.</p>';
  $("#summaryDate").textContent = prettyDate($("#appointmentDate").value);
  $("#summaryTime").textContent = state.selectedTime ? prettyTime(state.selectedTime) : "Not selected";
  $("#summaryTotal").textContent = money(selectedTotal());
}

async function loadServices() {
  $("#serviceGrid").innerHTML = '<div class="loading-card">Loading salon services…</div>';
  const { data, error } = await supabaseClient
    .from("services")
    .select("id,name,description,price,duration_minutes")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Could not load services:", error);
    $("#serviceGrid").innerHTML = '<div class="loading-card">We could not load services. Check the Supabase URL, publishable key, table permissions, and RLS policies.</div>';
    $("#servicePicker").innerHTML = '<p class="muted">Service list is unavailable right now.</p>';
    return;
  }
  state.services = data || [];
  renderServiceCards();
  renderServicePicker();
  renderSummary();
}

function isPastSlot(dateString, timeString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  const slotDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  return slotDate <= new Date();
}

async function loadSlots() {
  const date = $("#appointmentDate").value;
  const grid = $("#slotGrid");
  state.selectedTime = "";
  $("#appointmentTime").value = "";
  renderSummary();

  if (!date) {
    $("#slotStatus").textContent = "Choose a date first";
    grid.innerHTML = '<p class="muted">Select a date to view slots.</p>';
    return;
  }
  if (date < localDateString()) {
    $("#slotStatus").textContent = "Choose a future date";
    grid.innerHTML = '<p class="muted">Past dates cannot be booked.</p>';
    return;
  }

  $("#slotStatus").textContent = "Checking availability…";
  grid.innerHTML = '<p class="muted">Checking available slots…</p>';

  const { data, error } = await supabaseClient.rpc("get_booked_slots", { p_date: date });
  if (error) {
    console.error("Could not load booked slots:", error);
    $("#slotStatus").textContent = "Availability unavailable";
    grid.innerHTML = '<p class="muted">Could not check slots. Check the get_booked_slots function and its permissions in Supabase.</p>';
    return;
  }

  state.bookedTimes = new Set((data || []).map(row => String(row.booked_time).slice(0, 5)));
  const freeSlots = CONFIG.slotTimes.filter(time => !state.bookedTimes.has(time) && !isPastSlot(date, time));
  $("#slotStatus").textContent = `${freeSlots.length} available`;
  grid.innerHTML = CONFIG.slotTimes.map(time => {
    const booked = state.bookedTimes.has(time);
    const past = isPastSlot(date, time);
    const disabled = booked || past;
    return `<button type="button" class="slot-button" data-time="${time}" ${disabled ? "disabled" : ""} aria-pressed="false">${prettyTime(time)}${booked ? " · Booked" : past ? " · Passed" : ""}</button>`;
  }).join("");

  if (!freeSlots.length) {
    grid.insertAdjacentHTML("beforeend", '<p class="muted">No available slots for this date. Please choose another day.</p>');
  }
}

function setSelectedTime(time) {
  state.selectedTime = time;
  $("#appointmentTime").value = time;
  document.querySelectorAll(".slot-button").forEach(button => {
    const selected = button.dataset.time === time;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderSummary();
}

function buildWhatsAppMessage(booking, services, reminder) {
  const serviceLines = services.map(service => `• ${service.name} — ${money(service.price)}`).join("\n");
  return [
    `Hello ${CONFIG.salonName}!`,
    "",
    "I have submitted an appointment request with these details:",
    `Name: ${booking.customer_name}`,
    `Phone: ${booking.customer_phone}`,
    booking.customer_email ? `Email: ${booking.customer_email}` : null,
    `Date: ${prettyDate(booking.appointment_date)}`,
    `Time: ${prettyTime(booking.appointment_time)}`,
    "Services:",
    serviceLines,
    `Estimated total: ${money(booking.subtotal)}`,
    booking.message ? `Note: ${booking.message}` : null,
    reminder ? "I will arrive 10 minutes early." : null,
    "",
    "Please confirm my appointment. Thank you!",
    `— ${CONFIG.salonName}`
  ].filter(line => line !== null).join("\n");
}

async function submitBooking(event) {
  event.preventDefault();
  const errorBox = $("#bookingError");
  errorBox.textContent = "";

  const services = getSelectedServices();
  const date = $("#appointmentDate").value;
  const time = state.selectedTime;
  const customerName = $("#customerName").value.trim();
  const customerPhone = $("#customerPhone").value.trim();
  const customerEmail = $("#customerEmail").value.trim();
  const message = $("#customerMessage").value.trim();
  const reminder = $("#arrivalReminder").checked;

  if (!services.length) {
    errorBox.textContent = "Please select at least one service.";
    return;
  }
  if (!date || date < localDateString()) {
    errorBox.textContent = "Please choose today or a future date.";
    return;
  }
  if (!time) {
    errorBox.textContent = "Please select an available time slot.";
    return;
  }
  if (customerName.length < 2 || customerPhone.replace(/\D/g, "").length < 7) {
    errorBox.textContent = "Enter your name and a valid contact number.";
    return;
  }
  if (!CONFIG.slotTimes.includes(time) || state.bookedTimes.has(time) || isPastSlot(date, time)) {
    errorBox.textContent = "That slot is no longer available. Please choose another time.";
    await loadSlots();
    return;
  }

  const button = $("#submitBookingButton");
  button.disabled = true;
  button.textContent = "Saving appointment…";

  try {
    const { data: bookingId, error } = await supabaseClient.rpc("create_booking", {
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail || null,
      p_appointment_date: date,
      p_appointment_time: time,
      p_service_ids: services.map(service => service.id),
      p_message: message || null
    });

    if (error) {
      console.error("Booking failed:", error);
      const messageText = /duplicate|unique/i.test(error.message || "")
        ? "That slot was just booked by someone else. Please select another time."
        : (error.message || "Could not save your booking. Please try again.");
      errorBox.textContent = messageText;
      await loadSlots();
      return;
    }

    const booking = {
      id: bookingId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      appointment_date: date,
      appointment_time: time,
      message: message || null,
      subtotal: selectedTotal()
    };

    showToast("Your appointment request has been saved.");
    const whatsappText = buildWhatsAppMessage(booking, services, reminder);

    if (CONFIG.whatsappNumber && /^\d{8,15}$/.test(CONFIG.whatsappNumber)) {
      const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } else {
      showToast("Booking saved. Add the salon WhatsApp number in script.js to enable WhatsApp.");
    }

    $("#bookingForm").reset();
    state.selectedServiceIds.clear();
    state.selectedTime = "";
    $("#appointmentDate").value = date;
    renderServicePicker();
    renderSummary();
    await loadSlots();
    $("#booking").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    errorBox.textContent = "Unexpected error. Check your connection and try again.";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Request appointment <span aria-hidden="true">↗</span>';
  }
}

function openAdmin() {
  $("#adminShell").hidden = false;
  document.body.style.overflow = "hidden";
  $("#adminLoginError").textContent = "";
  checkExistingAdminSession();
}

function closeAdmin() {
  $("#adminShell").hidden = true;
  document.body.style.overflow = "";
}

async function checkExistingAdminSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session?.user) {
    const allowed = await verifyAdminRole();
    if (allowed) return;
    await supabaseClient.auth.signOut();
  }
  $("#adminLoginPanel").hidden = false;
  $("#adminDashboard").hidden = true;
}

async function verifyAdminRole() {
  const { data, error } = await supabaseClient.rpc("is_admin");
  if (error || data !== true) {
    $("#adminLoginPanel").hidden = false;
    $("#adminDashboard").hidden = true;
    $("#adminLoginError").textContent = "This account does not have the admin role.";
    return false;
  }
  $("#adminLoginPanel").hidden = true;
  $("#adminDashboard").hidden = false;
  const { data: sessionData } = await supabaseClient.auth.getUser();
  state.adminUser = sessionData?.user || null;
  await loadAdminAppointments();
  return true;
}

async function adminLogin(event) {
  event.preventDefault();
  $("#adminLoginError").textContent = "";
  const button = $("#adminLoginButton");
  button.disabled = true;
  button.textContent = "Signing in…";
  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  button.disabled = false;
  button.textContent = "Sign in securely";
  if (error) {
    $("#adminLoginError").textContent = "Sign-in failed. Check the email and password.";
    return;
  }
  const allowed = await verifyAdminRole();
  if (!allowed) await supabaseClient.auth.signOut();
}

async function loadAdminAppointments() {
  const list = $("#adminAppointmentList");
  list.innerHTML = '<p class="muted">Loading appointments…</p>';
  const { data, error } = await supabaseClient
    .from("appointments")
    .select("id,customer_name,customer_phone,customer_email,appointment_date,appointment_time,message,status,subtotal,price_adjustment,final_total,admin_notes,created_at,appointment_services(service_name,unit_price,duration_minutes)")
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Admin appointments load failed:", error);
    list.innerHTML = '<p class="muted">Could not load appointments. Check appointments table grants and admin RLS policies.</p>';
    return;
  }
  state.adminAppointments = data || [];
  renderAdminAppointments();
}

function renderAdminAppointments() {
  const dateFilter = $("#adminDateFilter").value;
  const statusFilter = $("#adminStatusFilter").value;
  const appointments = state.adminAppointments.filter(appointment =>
    (!dateFilter || appointment.appointment_date === dateFilter) &&
    (statusFilter === "all" || appointment.status === statusFilter)
  );

  const pending = state.adminAppointments.filter(a => a.status === "pending").length;
  const confirmed = state.adminAppointments.filter(a => a.status === "confirmed").length;
  $("#adminStats").innerHTML = `
    <div class="stat-card"><span>All loaded bookings</span><strong>${state.adminAppointments.length}</strong></div>
    <div class="stat-card"><span>Pending requests</span><strong>${pending}</strong></div>
    <div class="stat-card"><span>Confirmed visits</span><strong>${confirmed}</strong></div>`;

  if (!appointments.length) {
    $("#adminAppointmentList").innerHTML = '<div class="loading-card">No appointments match these filters.</div>';
    return;
  }

  $("#adminAppointmentList").innerHTML = appointments.map(appointment => {
    const serviceText = (appointment.appointment_services || [])
      .map(item => `${item.service_name} (${money(item.unit_price)})`).join(", ") || "No service details";
    const total = appointment.final_total ?? ((Number(appointment.subtotal) || 0) + (Number(appointment.price_adjustment) || 0));
    return `<article class="admin-appointment" data-appointment-id="${escapeHtml(appointment.id)}">
      <div>
        <span class="status-pill">${escapeHtml(appointment.status)}</span>
        <h3>${escapeHtml(appointment.customer_name)}</h3>
        <p>${escapeHtml(prettyDate(appointment.appointment_date))} · ${escapeHtml(prettyTime(appointment.appointment_time))}</p>
        <p>Phone: ${escapeHtml(appointment.customer_phone)}${appointment.customer_email ? ` · ${escapeHtml(appointment.customer_email)}` : ""}</p>
        <p class="appointment-services">${escapeHtml(serviceText)}</p>
        <p>Estimated total: <strong>${money(total)}</strong></p>
        ${appointment.message ? `<p>Customer note: ${escapeHtml(appointment.message)}</p>` : ""}
        ${appointment.admin_notes ? `<p>Admin notes: ${escapeHtml(appointment.admin_notes)}</p>` : ""}
      </div>
      <div class="admin-appointment-actions">
        <select aria-label="Update booking status" data-status-id="${escapeHtml(appointment.id)}">
          ${["pending","confirmed","completed","cancelled"].map(status => `<option value="${status}" ${appointment.status === status ? "selected" : ""}>${status[0].toUpperCase()+status.slice(1)}</option>`).join("")}
        </select>
        <button class="button button-outline" type="button" data-save-status="${escapeHtml(appointment.id)}">Save status</button>
      </div>
    </article>`;
  }).join("");
}

async function updateAppointmentStatus(id) {
  const select = document.querySelector(`[data-status-id="${CSS.escape(id)}"]`);
  if (!select) return;
  const { error } = await supabaseClient
    .from("appointments")
    .update({ status: select.value })
    .eq("id", id);
  if (error) {
    console.error(error);
    showToast("Could not update status. Check admin permissions.");
    return;
  }
  showToast("Appointment status updated.");
  await loadAdminAppointments();
  await loadSlots();
}

function init() {
  $("#currentYear").textContent = new Date().getFullYear();
  $("#appointmentDate").min = localDateString();
  $("#appointmentDate").value = localDateString();

  const hideIntro = () => $("#welcomeOverlay").classList.add("is-hidden");
  $("#enterSiteButton").addEventListener("click", hideIntro);
  $("#skipIntroButton").addEventListener("click", hideIntro);
  window.setTimeout(hideIntro, 5000);

  $("#menuToggle").addEventListener("click", () => {
    const open = $("#mainNav").classList.toggle("is-open");
    $("#menuToggle").setAttribute("aria-expanded", String(open));
    $("#menuToggle").setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  $("#mainNav").querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    $("#mainNav").classList.remove("is-open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
  }));

  $("#themeToggle").addEventListener("click", () => {
    const dark = document.body.classList.toggle("dark-theme");
    try { localStorage.setItem("sb-salon-theme", dark ? "dark" : "light"); } catch (_) {}
  });
  try {
    if (localStorage.getItem("sb-salon-theme") === "dark") document.body.classList.add("dark-theme");
  } catch (_) {}

  $("#servicePicker").addEventListener("change", event => {
    const input = event.target.closest("[data-service-id]");
    if (!input) return;
    if (input.checked) state.selectedServiceIds.add(input.dataset.serviceId);
    else state.selectedServiceIds.delete(input.dataset.serviceId);
    renderSummary();
  });
  $("#appointmentDate").addEventListener("change", loadSlots);
  $("#slotGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-time]");
    if (button && !button.disabled) setSelectedTime(button.dataset.time);
  });
  $("#bookingForm").addEventListener("submit", submitBooking);

  $("#openAdminButton").addEventListener("click", openAdmin);
  $("#footerAdminButton").addEventListener("click", openAdmin);
  $("#closeAdminButton").addEventListener("click", closeAdmin);
  $("#adminLoginForm").addEventListener("submit", adminLogin);
  $("#adminSignOutButton").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    state.adminUser = null;
    $("#adminLoginPanel").hidden = false;
    $("#adminDashboard").hidden = true;
    $("#adminPassword").value = "";
    showToast("You have signed out.");
  });
  $("#refreshAppointmentsButton").addEventListener("click", loadAdminAppointments);
  $("#adminDateFilter").addEventListener("change", renderAdminAppointments);
  $("#adminStatusFilter").addEventListener("change", renderAdminAppointments);
  $("#adminAppointmentList").addEventListener("click", event => {
    const button = event.target.closest("[data-save-status]");
    if (button) updateAppointmentStatus(button.dataset.saveStatus);
  });

  loadServices();
  loadSlots();
  renderSummary();
}

document.addEventListener("DOMContentLoaded", init);
