const mongoose = require("mongoose");

const trainerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        specialization: {
            type: String,
            required: true,
            trim: true
        },

        experience: {
            type: Number,
            required: true,
            min: 0
        },

        availability: {
            type: String,
            required: true,
            trim: true
        },

        bio: {
            type: String,
            default: "",
            trim: true
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Trainer", trainerSchema);