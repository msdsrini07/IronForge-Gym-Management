
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Reference the separate Trainer collection
        trainer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trainer",
            default: null
        },

        program: {
            type: String,
            required: true,
            trim: true
        },

        bookingDate: {
            type: Date,
            required: true
        },

        startTime: {
            type: String,
            required: true,
            trim: true
        },

        endTime: {
            type: String,
            required: true,
            trim: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "cancelled",
                "completed"
            ],
            default: "pending"
        },

        notes: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Booking", bookingSchema);
