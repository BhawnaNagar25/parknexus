require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ MongoDB — credentials in .env
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err));

// ─── SCHEMA ───

const vehicleSchema = new mongoose.Schema({
    vehicle_number: { type: String, unique: true },
    slot: String
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

// ─── MIN HEAP ──────────────────────────────────────────────────────────────────

class MinHeap {
    constructor() {
        this.heap = [];
    }

    insert(node) {
        this.heap.push(node);
        this.bubbleUp();
    }

    bubbleUp() {
        let i = this.heap.length - 1;
        while (i > 0) {
            let p = Math.floor((i - 1) / 2);
            if (this.heap[p].distance <= this.heap[i].distance) break;
            [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
            i = p;
        }
    }

    extractMin() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();

        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown();
        return min;
    }

    bubbleDown() {
        let i = 0;
        const len = this.heap.length;

        while (true) {
            let left = 2 * i + 1;
            let right = 2 * i + 2;
            let smallest = i;

            if (left < len && this.heap[left].distance < this.heap[smallest].distance) {
                smallest = left;
            }
            if (right < len && this.heap[right].distance < this.heap[smallest].distance) {
                smallest = right;
            }

            if (smallest === i) break;

            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}

// ─── SLOTS ─────────────────────────────────────────────────────────────────────

const slots = [
    { slot: "A1", distance: 1 },
    { slot: "A2", distance: 2 },
    { slot: "A3", distance: 3 },
    { slot: "B1", distance: 4 },
    { slot: "B2", distance: 5 }
];

// ─── ROOT ──────────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
    res.send("🚗 ParkNexus Backend Running");
});

// ─── PARK ──────────────────────────────────────────────────────────────────────

app.post("/park", async (req, res) => {
    try {
        // Normalize input
        const vehicle_number = req.body.vehicle_number?.trim().toUpperCase();

        if (!vehicle_number) {
            return res.status(400).json({ message: "Enter vehicle number" });
        }

        // Duplicate check
        const existing = await Vehicle.findOne({ vehicle_number });
        if (existing) {
            return res.status(409).json({ message: "Vehicle already parked", slot: existing.slot });
        }

        const vehicles = await Vehicle.find();

        // Parking full check
        if (vehicles.length >= slots.length) {
            return res.status(400).json({ message: "Parking Full" });
        }

        const occupied = vehicles.map(v => v.slot);

        // Build heap with only free slots
        const heap = new MinHeap();
        slots.forEach(s => {
            if (!occupied.includes(s.slot)) {
                heap.insert(s);
            }
        });

        const nearest = heap.extractMin();

        if (!nearest) {
            return res.status(400).json({ message: "Parking Full" });
        }

        const newVehicle = new Vehicle({ vehicle_number, slot: nearest.slot });
        await newVehicle.save();

        res.json({
            message: "Parking Successful",
            vehicle: vehicle_number,
            slot: nearest.slot
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── EXIT ──────────────────────────────────────────────────────────────────────

app.post("/exit", async (req, res) => {
    try {
        // Normalize input
        const vehicle_number = req.body.vehicle_number?.trim().toUpperCase();

        if (!vehicle_number) {
            return res.status(400).json({ message: "Enter vehicle number" });
        }

        const vehicle = await Vehicle.findOne({ vehicle_number });

        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        await Vehicle.deleteOne({ vehicle_number });

        res.json({
            message: "Exit Successful",
            slot_freed: vehicle.slot
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── STATUS ────────────────────────────────────────────────────────────────────

app.get("/status", async (req, res) => {
    try {
        const vehicles = await Vehicle.find();
        const occupiedSlotIds = vehicles.map(v => v.slot);

        const occupiedDetailed = vehicles.map(v => {
            const slotInfo = slots.find(s => s.slot === v.slot);
            return {
                vehicle_number: v.vehicle_number,
                slot: v.slot,
                distance: slotInfo ? slotInfo.distance : null
            };
        });

        const freeDetailed = slots
            .filter(s => !occupiedSlotIds.includes(s.slot))
            .map(s => ({ slot: s.slot, distance: s.distance }));

        res.json({
            occupied_slots: occupiedDetailed,
            available_slots: freeDetailed,
            total_occupied: occupiedDetailed.length,
            total_available: freeDetailed.length
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server Error" });
    }
});
// ─── RESET (protected by secret key) ──────────────────────────────────────────

app.post("/reset", async (req, res) => {
    try {
        const { secret } = req.body;

        if (secret !== process.env.RESET_SECRET) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await Vehicle.deleteMany({});
        res.json({ message: "System Reset Done" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── SERVER ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
