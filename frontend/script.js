const API = "https://parknexus-backend.onrender.com";

let historyList = [];

// 🚗 Park Vehicle
function park() {
    let input = document.getElementById("entry");
    if (!input) return;

    let vehicle = input.value.trim();

    if (!vehicle) {
        alert("Enter vehicle number");
        return;
    }

    fetch(API + "/park", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        let result = document.getElementById("result");
        if (result) {
            result.innerHTML = data.message + (data.slot ? " → " + data.slot : "");
        }

        input.value = "";
        status(); // refresh UI
    })
    .catch(err => console.log("Error:", err));
}

// 🚪 Exit Vehicle
function exitVehicle() {
    let input = document.getElementById("exit");
    if (!input) return;

    let vehicle = input.value.trim();

    if (!vehicle) {
        alert("Enter vehicle number");
        return;
    }

    fetch(API + "/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_number: vehicle })
    })
    .then(res => res.json())
    .then(data => {
        let result = document.getElementById("result");
        if (result) {
            result.innerHTML =
                data.message +
                (data.slot_freed ? " → Freed: " + data.slot_freed : "");
        }

        input.value = "";
        status(); // refresh UI
    })
    .catch(err => console.log("Error:", err));
}

// 📊 Parking Status
function status() {
    fetch(API + "/status")
    .then(res => res.json())
    .then(data => {

        // 🔹 Summary
        let result = document.getElementById("result");
        if (result) {
            result.innerHTML =
                "<b>Free:</b> " + data.total_available +
                " | <b>Occupied:</b> " + data.total_occupied;
        }

        const allSlots = ["A1", "A2", "A3", "B1", "B2"];

        let grid = document.getElementById("parkingGrid");
        if (!grid) return;

        grid.innerHTML = "";

        allSlots.forEach(slot => {
            let div = document.createElement("div");
            div.className = "slot";

            let vehicle = null;

            // 🔍 Safe loop
            let occupied = data.occupied_slots || {};

            for (let v in occupied) {
                if (occupied[v] === slot) {
                    vehicle = v;
                    break;
                }
            }

            if (vehicle) {
                // 🔴 Occupied
                div.classList.add("occupied");
                div.innerHTML = `
                    <div>${slot}</div>
                    <div class="vehicle">${vehicle}</div>
                `;

                // 📜 History
                if (!historyList.includes(vehicle)) {
                    historyList.push(vehicle);
                }

            } else {
                // 🟢 Free
                div.classList.add("free");
                div.innerHTML = `<div>${slot}</div>`;
            }

            // ✨ Animation
            div.classList.add("changed");
            setTimeout(() => div.classList.remove("changed"), 300);

            grid.appendChild(div);
        });

        // 📜 History UI
        let historyUI = document.getElementById("history");
        if (historyUI) {
            historyUI.innerHTML = "";

            historyList.slice().reverse().forEach(v => {
                let li = document.createElement("li");
                li.innerText = "🚗 " + v;
                historyUI.appendChild(li);
            });
        }

    })
    .catch(err => console.log("Error:", err));
}

// 🔥 Load on page start
window.onload = () => {
    status();
};