const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        duration: {
            type: Number,
            required: true,
            min: 1
        },

        description: {
            type: String,
            trim: true
        },

        features: {
            type: [String],
            default: []
        },

        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Plan", planSchema);