const API = "https://parknexus-backend.onrender.com";

let historyList = JSON.parse(localStorage.getItem("pnHistory") || "[]");

let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

function setResult(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = "card-result " + (type || "");
}

function saveHistory() {
    localStorage.setItem("pnHistory", JSON.stringify(historyList.slice(0, 50)));
}

function park() {
    const input = document.getElementById("entryInput");
    const btn   = document.getElementById("parkBtn");
    if (!input || !btn) return;

    const vehicle = input.value.trim().toUpperCase();
    if (!vehicle) { showToast("Enter a vehicle number"); return; }

    btn.disabled = true;
    setResult("entryResult", "Allocating slot...", "info");

    fetch(API + "/park", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        if (data.slot) {
            setResult("entryResult", `✓ ${data.message} — Slot ${data.slot}`, "success");
            showToast(`🚗 ${vehicle} → Slot ${data.slot}`);
            historyList.unshift({
                vehicle, slot: data.slot, action: "Parked",
                time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            });
            saveHistory();
        } else {
            setResult("entryResult", data.message, "error");
            showToast(data.message);
        }
        input.value = "";
        loadStatus();
    })
    .catch(() => {
        setResult("entryResult", "Cannot connect to server", "error");
        showToast("❌ Server unreachable");
    })
    .finally(() => { btn.disabled = false; });
}

function exitVehicle() {
    const input = document.getElementById("exitInput");
    const btn   = document.getElementById("exitBtn");
    if (!input || !btn) return;

    const vehicle = input.value.trim().toUpperCase();
    if (!vehicle) { showToast("Enter a vehicle number"); return; }

    btn.disabled = true;
    setResult("exitResult", "Processing exit...", "info");

    fetch(API + "/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        if (data.slot_freed) {
            setResult("exitResult", `✓ ${data.message} — Slot ${data.slot_freed} freed`, "success");
            showToast(`🏁 ${vehicle} exited — Slot ${data.slot_freed} free`);
            historyList.unshift({
                vehicle, slot: data.slot_freed, action: "Exited",
                time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            });
            saveHistory();
        } else {
            setResult("exitResult", data.message, "error");
            showToast(data.message);
        }
        input.value = "";
        loadStatus();
    })
    .catch(() => {
        setResult("exitResult", "Cannot connect to server", "error");
        showToast("❌ Server unreachable");
    })
    .finally(() => { btn.disabled = false; });
}

function loadStatus() {
    const refreshBtn = document.querySelector(".refresh-btn");
    if (refreshBtn) refreshBtn.classList.add("spinning");

    fetch(API + "/status")
    .then(res => res.json())
    .then(data => {
        const freeEl = document.getElementById("freeCount");
        const occEl  = document.getElementById("occCount");
        if (freeEl) freeEl.textContent = data.total_available ?? "—";
        if (occEl)  occEl.textContent  = data.total_occupied  ?? "—";

        const grid = document.getElementById("parkingGrid");
        if (!grid) return;

        const available = Array.isArray(data.available_slots) ? data.available_slots : [];
        const occupied  = Array.isArray(data.occupied_slots)  ? data.occupied_slots  : [];

        const allSlots = [
            ...available.map(s => ({ id: s.slot, distance: s.distance, free: true,  vehicle: null })),
            ...occupied.map(s  => ({ id: s.slot, distance: s.distance, free: false, vehicle: s.vehicle_number }))
        ].sort((a, b) => a.id.localeCompare(b.id));

        grid.innerHTML = "";

        allSlots.forEach(slot => {
            const card = document.createElement("div");
            card.className = `slot-card ${slot.free ? "free" : "occupied"}`;
            card.dataset.slot = slot.id;
            card.innerHTML = `
                <span class="slot-car-icon">${slot.free ? "🅿️" : "🚗"}</span>
                <div class="slot-id">${slot.id}</div>
                <div class="slot-status">${slot.free ? "Free" : "Occupied"}</div>
                <div class="slot-distance">dist: ${slot.distance}</div>
                ${slot.vehicle ? `<div class="slot-vehicle">${slot.vehicle}</div>` : ""}
            `;
            grid.appendChild(card);
        });

        renderHistory();
    })
    .catch(() => {
    showToast("⏳ Backend waking up, retrying...");
    setTimeout(loadStatus, 5000);
})
    .finally(() => {
        if (refreshBtn) refreshBtn.classList.remove("spinning");
    });
}

function renderHistory() {
    const list = document.getElementById("historyList");
    if (!list) return;
    if (historyList.length === 0) {
        list.innerHTML = `<div class="history-empty">No activity yet</div>`;
        return;
    }
    list.innerHTML = historyList.map(entry => `
        <div class="history-item">
            <div class="history-badge ${entry.action.toLowerCase()}">
                ${entry.action === "Parked" ? "🚗" : "🏁"}
            </div>
            <div class="history-info">
                <div class="history-plate">${entry.vehicle}</div>
                <div class="history-meta">${entry.action} · Slot ${entry.slot}</div>
            </div>
            <div class="history-time">${entry.time}</div>
        </div>
    `).join("");
}

function clearHistory() {
    historyList = [];
    saveHistory();
    renderHistory();
    showToast("Activity log cleared");
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("entryInput")?.addEventListener("keydown", e => {
        if (e.key === "Enter") park();
    });
    document.getElementById("exitInput")?.addEventListener("keydown", e => {
        if (e.key === "Enter") exitVehicle();
    });
    loadStatus();
    renderHistory();
});