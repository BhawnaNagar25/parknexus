const API = "https://parknexus-backend.onrender.com";

let historyList = JSON.parse(localStorage.getItem("parkHistory") || "[]");

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

function park() {
    const input = document.getElementById("entry");
    const btn = document.getElementById("parkBtn");
    if (!input || !btn) return;

    const vehicle = input.value.trim().toUpperCase();
    if (!vehicle) { alert("Enter vehicle number"); return; }

    btn.disabled = true;

    fetch(API + "/park", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        setActionResult("🚗 " + data.message + (data.slot ? " -> Slot: " + data.slot : ""));
        if (data.slot) {
            historyList.unshift({ vehicle, slot: data.slot, time: new Date().toLocaleTimeString(), action: "Parked" });
            saveHistory();
        }
        input.value = "";
        status();
    })
    .catch(err => { console.log(err); setActionResult("Could not connect to server."); })
    .finally(() => { btn.disabled = false; });
}

function exitVehicle() {
    const input = document.getElementById("exit");
    const btn = document.getElementById("exitBtn");
    if (!input || !btn) return;

    const vehicle = input.value.trim().toUpperCase();
    if (!vehicle) { alert("Enter vehicle number"); return; }

    btn.disabled = true;

    fetch(API + "/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        setActionResult("🏁 " + data.message + (data.slot_freed ? " -> Freed: " + data.slot_freed : ""));
        if (data.slot_freed) {
            historyList.unshift({ vehicle, slot: data.slot_freed, time: new Date().toLocaleTimeString(), action: "Exited" });
            saveHistory();
        }
        input.value = "";
        status();
    })
    .catch(err => { console.log(err); setActionResult("Could not connect to server."); })
    .finally(() => { btn.disabled = false; });
}

function status() {
    fetch(API + "/status")
    .then(res => res.json())
    .then(data => {
        setStatusResult("<b>Free:</b> " + data.total_available + " | <b>Occupied:</b> " + data.total_occupied);

        const allSlots = [
            ...(data.available_slots || []).map(s => s.slot),
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
                div.innerHTML = "<div>" + slotId + "</div><div class='vehicle'>" + vehicleObj.vehicle_number + "</div>";
            } else {
                div.classList.add("free");
                div.innerHTML = "<div>" + slotId + "</div><div class='vehicle'>Free</div>";
            }
            div.classList.add("changed");
            setTimeout(() => div.classList.remove("changed"), 400);
            grid.appendChild(div);
        });

        renderHistory();
    })
    .catch(err => { console.log(err); setStatusResult("Could not fetch status."); });
}

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
        li.innerText = icon + " " + entry.action + ": " + entry.vehicle + " | Slot: " + entry.slot + " | " + entry.time;
        historyUI.appendChild(li);
    });
}

window.onload = () => {
    status();
    renderHistory();
};