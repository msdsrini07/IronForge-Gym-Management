const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Existing plan name kept for backward compatibility
        plan: {
            type: String,
            required: true,
            trim: true
        },

        // New reference to Plan collection
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            default: null
        },

        status: {
            type: String,
            enum: ["active", "expired", "cancelled"],
            default: "active"
        },

        startDate: {
            type: Date,
            required: true
        },

        expiryDate: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Membership", membershipSchema);