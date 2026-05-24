const API = "https://parknexus-backend.onrender.com";

// Persisted history using localStorage
let historyList = JSON.parse(localStorage.getItem("parkHistory") || "[]");

// ─── Helpers ───────────────────────────────────────────────────────────────────

function setActionResult(msg) {
    const el = document.getElementById("actionResult");
    if (el) el.innerHTML = msg;
}

function setStatusResult(msg) {
    const el = document.getElementById("result");
    if (el) el.innerHTML = msg;
}

function saveHistory() {
    localStorage.setItem("parkHistory", JSON.stringify(historyList));
}

// ─── Park Vehicle ──────────────────────────────────────────────────────────────

function park() {
    const input = document.getElementById("entry");
    const btn = document.getElementById("parkBtn");
    if (!input || !btn) return;

    const vehicle = input.value.trim().toUpperCase();

    if (!vehicle) {
        alert("Enter vehicle number");
        return;
    }

    btn.disabled = true;

    fetch(API + "/park", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        const msg = data.message + (data.slot ? " → Slot: " + data.slot : "");
        setActionResult("🚗 " + msg);

        // Add to history only on success
        if (data.slot) {
            const entry = { vehicle, slot: data.slot, time: new Date().toLocaleTimeString(), action: "Parked" };
            historyList.unshift(entry);
            saveHistory();
        }

        input.value = "";
        status();
    })
    .catch(err => {
        console.log("Error:", err);
        setActionResult("❌ Could not connect to server.");
    })
    .finally(() => {
        btn.disabled = false;
    });
}

// ─── Exit Vehicle ──────────────────────────────────────────────────────────────

function exitVehicle() {
    const input = document.getElementById("exit");
    const btn = document.getElementById("exitBtn");
    if (!input || !btn) return;

    const vehicle = input.value.trim().toUpperCase();

    if (!vehicle) {
        alert("Enter vehicle number");
        return;
    }

    btn.disabled = true;

    fetch(API + "/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        const msg = data.message + (data.slot_freed ? " → Freed: " + data.slot_freed : "");
        setActionResult("🏁 " + msg);

        // Add to history only on success
        if (data.slot_freed) {
            const entry = { vehicle, slot: data.slot_freed, time: new Date().toLocaleTimeString(), action: "Exited" };
            historyList.unshift(entry);
            saveHistory();
        }

        input.value = "";
        status();
    })
    .catch(err => {
        console.log("Error:", err);
        setActionResult("❌ Could not connect to server.");
    })
    .finally(() => {
        btn.disabled = false;
    });
}

// ─── Parking Status ────────────────────────────────────────────────────────────

function status() {
    fetch(API + "/status")
    .then(res => res.json())
    .then(data => {

        // Summary — separate div from action messages
        setStatusResult(
            "<b>Free:</b> " + data.total_available +
            " | <b>Occupied:</b> " + data.total_occupied
        );

        // Build slot list from backend response (not hardcoded)
        const allSlots = [
            ...( data.available_slots || []).map(s => s.slot),
            ...(data.occupied_slots || []).map(s => s.slot)
        ].sort();

        const grid = document.getElementById("parkingGrid");
        if (!grid) return;

        grid.innerHTML = "";

        allSlots.forEach(slotId => {
            const div = document.createElement("div");
            div.className = "slot";

            const vehicleObj = (data.occupied_slots || []).find(v => v.slot === slotId);

            if (vehicleObj) {
                div.classList.add("occupied");
                div.innerHTML = `
                    <div>${slotId}</div>
                    <div class="vehicle">${vehicleObj.vehicle_number}</div>
                `;
            } else {
                div.classList.add("free");
                div.innerHTML = `<div>${slotId}</div><div class="vehicle">Free</div>`;
            }

            // Animate slot change
            div.classList.add("changed");
            setTimeout(() => div.classList.remove("changed"), 400);

            grid.appendChild(div);
        });

        // Render history from localStorage
        renderHistory();
    })
    .catch(err => {
        console.log("Error:", err);
        setStatusResult("❌ Could not fetch status.");
    });
}

// ─── Render History ────────────────────────────────────────────────────────────

function renderHistory() {
    const historyUI = document.getElementById("history");
    if (!historyUI) return;

    historyUI.innerHTML = "";

    if (historyList.length === 0) {
        const li = document.createElement("li");
        li.innerText = "No history yet.";
        historyUI.appendChild(li);
        return;
    }

    historyList.forEach(entry => {
        const li = document.createElement("li");
        const icon = entry.action === "Parked" ? "🚗" : "🏁";
        li.innerText = `${icon} ${entry.action}: ${entry.vehicle} | Slot: ${entry.slot} | ${entry.time}`;
        historyUI.appendChild(li);
    });
}

// ─── Load on start ─────────────────────────────────────────────────────────────

window.onload = () => {
    status();
    renderHistory();
};
