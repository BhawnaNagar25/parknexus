const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ CONNECT MONGODB
mongoose.connect("mongodb://bhawnanagar25:bhawnaNagar_55@ac-t9o2fhg-shard-00-00.qlt2jr5.mongodb.net:27017,ac-t9o2fhg-shard-00-01.qlt2jr5.mongodb.net:27017,ac-t9o2fhg-shard-00-02.qlt2jr5.mongodb.net:27017/parknexus?ssl=true&replicaSet=atlas-niozd5-shard-0&authSource=admin&retryWrites=true&w=majority")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

// -------- SCHEMA --------
const vehicleSchema = new mongoose.Schema({
    vehicle_number: String,
    slot: String
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

// -------- Parking Slots --------
let initialSlots = ["A1", "A2", "A3", "B1", "B2"];

// -------- Root --------
app.get("/", (req, res) => {
    res.send("🚗 ParkNexus Backend Running");
});

// -------- Park Vehicle --------
app.post("/park", async (req, res) => {
    try {
        const { vehicle_number } = req.body;

        console.log("API HIT"); // 👈 check if API runs

        let freeSlot = "A1"; // temp test

        const data = await Vehicle.create({
            vehicle_number,
            slot: freeSlot
        });

        console.log("Saved to DB:", data); // 👈 check save

        res.json({ message: "Saved", data });

    } catch (err) {
        console.log("ERROR:", err); // 👈 VERY IMPORTANT
        res.json({ message: "Error", err });
    }
});

// -------- Exit Vehicle --------
app.post("/exit", async (req, res) => {
    const { vehicle_number } = req.body;

    if (!vehicle_number) {
        return res.json({ message: "Enter vehicle number" });
    }

    let vehicle = await Vehicle.findOne({ vehicle_number });

    if (!vehicle) {
        return res.json({ message: "Vehicle not found" });
    }

    let slot = vehicle.slot;

    // ✅ DELETE FROM DB
    await Vehicle.deleteOne({ vehicle_number });

    res.json({
        message: "Exit Successful",
        slot_freed: slot
    });
});

// -------- Status --------
app.get("/status", async (req, res) => {

    let allVehicles = await Vehicle.find();

    let occupiedSlots = allVehicles.map(v => v.slot);

    let freeSlots = initialSlots.filter(
        slot => !occupiedSlots.includes(slot)
    );

    // convert to map for UI
    let vehicleMap = {};
    allVehicles.forEach(v => {
        vehicleMap[v.vehicle_number] = v.slot;
    });

    res.json({
        available_slots: freeSlots,
        occupied_slots: vehicleMap,
        total_available: freeSlots.length,
        total_occupied: occupiedSlots.length
    });
});

// -------- Reset --------
app.get("/reset", async (req, res) => {
    await Vehicle.deleteMany({});
    res.json({ message: "System Reset Done" });
});

// -------- Server --------
app.listen(5000, () => {
    console.log("🚀 Server running at http://localhost:5000");
});