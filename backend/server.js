require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Membership = require("./models/Membership");
const Plan = require("./models/Plan");
const Booking = require("./models/Booking");
const Trainer = require("./models/Trainer");

const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");
const adminMiddleware = require("./middleware/adminMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// AUTH
app.use("/api/auth", authRoutes);



// HOME
app.get("/", (req, res) => {
    res.send("IronForge Backend is Running! 💪");
});

// PROTECTED TEST ROUTE
app.get("/api/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You have access to the protected route! 🔐",
        user: req.user
    });
});

// ADMIN TEST ROUTE
app.get("/api/admin", authMiddleware, adminMiddleware, (req, res) => {
    res.json({
        message: "Welcome Admin! 👑",
        user: req.user
    });
});

// USER PROFILE
app.get("/api/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.json({
            message: "Profile fetched successfully",
            user
        });
    } catch (error) {
        console.error("Profile error:", error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// GET CURRENT USER MEMBERSHIP
app.get("/api/membership", authMiddleware, async (req, res) => {
    try {
        const now = new Date();

        let membership = await Membership.findOne({
            user: req.user.id,
            status: "active",
            expiryDate: { $gt: now }
        })
            .populate("planId")
            .sort({ expiryDate: -1 });

        if (!membership) {
            membership = await Membership.findOne({
                user: req.user.id
            })
                .populate("planId")
                .sort({ expiryDate: -1, createdAt: -1 });
        }

        if (!membership) {
            return res.status(404).json({
                message: "No membership found"
            });
        }

        const expiryDate = new Date(membership.expiryDate);

        if (
            membership.status !== "cancelled" &&
            !isNaN(expiryDate.getTime()) &&
            now >= expiryDate
        ) {
            membership.status = "expired";
            await membership.save();
        }

        const remainingDays = Math.max(
            0,
            Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000)
        );

        let expiryStatus = membership.status;

        if (membership.status === "active" && remainingDays <= 7) {
            expiryStatus = "expiring_soon";
        }

        const membershipData = membership.toObject();
        membershipData.remainingDays = remainingDays;
        membershipData.expiryStatus = expiryStatus;

        return res.json({
            message: "Membership fetched successfully",
            membership: membershipData
        });
    } catch (error) {
        console.error("Get current membership error:", error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// MEMBERSHIP HISTORY
app.get("/api/membership/history", authMiddleware, async (req, res) => {
    try {
        const memberships = await Membership.find({
            user: req.user.id
        })
            .populate("planId")
            .sort({ createdAt: -1 });

        return res.json({
            message: "Membership history fetched successfully",
            count: memberships.length,
            memberships: memberships.map((item) => {
                const data = item.toObject();
                const expiryDate = new Date(data.expiryDate);
                const now = new Date();

                if (
                    data.status !== "cancelled" &&
                    !isNaN(expiryDate.getTime()) &&
                    now >= expiryDate
                ) {
                    data.displayStatus = "expired";
                } else {
                    data.displayStatus = data.status;
                }

                data.remainingDays = Math.max(
                    0,
                    Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000)
                );

                data.expiryStatus =
                    data.displayStatus === "active" &&
                    data.remainingDays <= 7
                        ? "expiring_soon"
                        : data.displayStatus;

                return data;
            })
        });
    } catch (error) {
        console.error("Membership history error:", error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

// CREATE MEMBERSHIP — ADMIN
app.post("/api/membership", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId, planId, startDate } = req.body;

        if (!userId || !planId || !startDate) {
            return res.status(400).json({
                message: "User, plan and start date are required"
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(planId)
        ) {
            return res.status(400).json({
                message: "Invalid user ID or plan ID"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.role !== "customer") {
            return res.status(400).json({
                message: "Membership can only be assigned to customers"
            });
        }

        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                message: "Plan not found"
            });
        }

        if (!plan.active) {
            return res.status(400).json({
                message: "Selected plan is inactive"
            });
        }

        const now = new Date();

        const existingMembership = await Membership.findOne({
            user: userId,
            status: "active",
            expiryDate: { $gt: now }
        });

        if (existingMembership) {
            return res.status(409).json({
                message: "Member already has an active membership",
                membershipId: existingMembership._id,
                currentPlan: existingMembership.plan,
                expiryDate: existingMembership.expiryDate
            });
        }

        const membershipStartDate = new Date(startDate);
        if (isNaN(membershipStartDate.getTime())) {
            return res.status(400).json({
                message: "Invalid start date"
            });
        }

        const membershipExpiryDate = new Date(membershipStartDate);
        membershipExpiryDate.setDate(
            membershipExpiryDate.getDate() + Number(plan.duration)
        );

        const membership = await Membership.create({
            user: userId,
            plan: plan.name,
            planId: plan._id,
            status: "active",
            startDate: membershipStartDate,
            expiryDate: membershipExpiryDate
        });

        await membership.populate("planId");
        await membership.populate("user", "name email role");

        return res.status(201).json({
            message: "Membership created successfully",
            membership
        });
    } catch (error) {
        console.error("Create membership error:", error);
        return res.status(500).json({
            message: "Server error"
        });
    }
});

/* ============================
   RENEW MEMBERSHIP — ADMIN
   Preserves remaining membership time
============================ */


/* ============================
   RENEW MEMBERSHIP — ADMIN
   Prevents duplicate active memberships
   Preserves membership history
============================ */

app.post(
    "/api/membership/:membershipId/renew",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const { membershipId } = req.params;
            const { planId } = req.body;

            // 1. Validate membership ID
            if (!mongoose.Types.ObjectId.isValid(membershipId)) {
                return res.status(400).json({
                    message: "Invalid membership ID"
                });
            }

            // 2. Validate plan ID
            if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
                return res.status(400).json({
                    message: "Valid plan ID is required"
                });
            }

            // 3. Find the current membership
            const currentMembership =
                await Membership.findById(membershipId);

            if (!currentMembership) {
                return res.status(404).json({
                    message: "Membership not found"
                });
            }

            // 4. Prevent renewal of cancelled memberships
            if (currentMembership.status === "cancelled") {
                return res.status(400).json({
                    message: "Cancelled memberships cannot be renewed"
                });
            }

            const now = new Date();

            // 5. Prevent duplicate renewal if another valid
            // active membership already exists for this customer
            const existingActiveMembership =
                await Membership.findOne({
                    user: currentMembership.user,
                    status: "active",
                    expiryDate: { $gt: now },
                    _id: { $ne: currentMembership._id }
                });

            if (existingActiveMembership) {
                return res.status(409).json({
                    message:
                        "This member already has another active membership. Duplicate renewal is not allowed."
                });
            }

            // 6. Validate the selected plan
            const plan = await Plan.findById(planId);

            if (!plan || plan.active !== true) {
                return res.status(400).json({
                    message:
                        "Please select an active membership plan"
                });
            }

            // 7. Validate plan duration
            const duration = Number(plan.duration);

            if (!Number.isFinite(duration) || duration <= 0) {
                return res.status(400).json({
                    message: "Membership plan duration is invalid"
                });
            }

            // 8. Calculate renewal start and expiry dates
            const currentExpiry =
                new Date(currentMembership.expiryDate);

            const renewalStart =
                currentExpiry > now ? currentExpiry : now;

            const newExpiry = new Date(renewalStart);

            newExpiry.setDate(
                newExpiry.getDate() + duration
            );

            // 9. Preserve the old membership record
            currentMembership.status = "expired";
            await currentMembership.save();

            // 10. Create the renewed membership
            const renewedMembership = await Membership.create({
                user: currentMembership.user,
                plan: plan.name,
                planId: plan._id,
                status: "active",
                startDate: renewalStart,
                expiryDate: newExpiry
            });

            // 11. Populate related customer and plan details
            await renewedMembership.populate("planId");
            await renewedMembership.populate(
                "user",
                "name email role"
            );

            // 12. Send success response
            return res.status(201).json({
                message: "Membership renewed successfully",
                membership: renewedMembership
            });

        } catch (error) {
            console.error(
                "Renew membership error:",
                error
            );

            return res.status(500).json({
                message:
                    "Server error while renewing membership"
            });
        }
    }
);


// CANCEL MEMBERSHIP — ADMIN
app.put(
    "/api/membership/:membershipId/cancel",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const membership = await Membership.findById(
                req.params.membershipId
            );

            if (!membership) {
                return res.status(404).json({
                    message: "Membership not found"
                });
            }

            if (membership.status === "cancelled") {
                return res.status(400).json({
                    message: "Membership is already cancelled"
                });
            }

            membership.status = "cancelled";
            await membership.save();

            return res.json({
                message: "Membership cancelled successfully",
                membership
            });
        } catch (error) {
            console.error("Cancel membership error:", error);
            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);

// REACTIVATE MEMBERSHIP — ADMIN
app.put(
    "/api/membership/:membershipId/reactivate",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const membership = await Membership.findById(
                req.params.membershipId
            );

            if (!membership) {
                return res.status(404).json({
                    message: "Membership not found"
                });
            }

            if (new Date() >= new Date(membership.expiryDate)) {
                return res.status(400).json({
                    message: "Membership has already expired"
                });
            }

            const otherActive = await Membership.findOne({
                user: membership.user,
                status: "active",
                _id: { $ne: membership._id },
                expiryDate: { $gt: new Date() }
            });

            if (otherActive) {
                return res.status(409).json({
                    message: "Member already has another active membership"
                });
            }

            membership.status = "active";
            await membership.save();

            return res.json({
                message: "Membership reactivated successfully",
                membership
            });
        } catch (error) {
            console.error("Reactivate membership error:", error);
            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);


/* ============================
   RENEW MEMBERSHIP — ADMIN
   Transaction-safe renewal
   Preserves membership history
============================ */

app.post(
    "/api/membership/:membershipId/renew",
    authMiddleware,
    adminMiddleware,
  async (req, res) => {
    let session;

    try {
        session = await mongoose.startSession();
            const { membershipId } = req.params;
            const { planId } = req.body;

            // 1. Validate membership ID
            if (!mongoose.Types.ObjectId.isValid(membershipId)) {
                return res.status(400).json({
                    message: "Invalid membership ID"
                });
            }

            // 2. Validate plan ID
            if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
                return res.status(400).json({
                    message: "Valid plan ID is required"
                });
            }

            let renewedMembership;

            // 3. Run all membership changes in one transaction
            await session.withTransaction(async () => {
                const currentMembership =
                    await Membership.findById(membershipId)
                        .session(session);

                if (!currentMembership) {
                    const error = new Error("Membership not found");
                    error.statusCode = 404;
                    throw error;
                }

                if (currentMembership.status === "cancelled") {
                    const error = new Error(
                        "Cancelled memberships cannot be renewed"
                    );
                    error.statusCode = 400;
                    throw error;
                }

                const now = new Date();

                // 4. Prevent renewal when another valid
                // active membership exists for this user
                const existingActiveMembership =
                    await Membership.findOne({
                        user: currentMembership.user,
                        status: "active",
                        expiryDate: { $gt: now },
                        _id: { $ne: currentMembership._id }
                    }).session(session);

                if (existingActiveMembership) {
                    const error = new Error(
                        "This member already has another active membership. Duplicate renewal is not allowed."
                    );
                    error.statusCode = 409;
                    throw error;
                }

                // 5. Validate the selected plan
                const plan = await Plan.findById(planId)
                    .session(session);

                if (!plan || plan.active !== true) {
                    const error = new Error(
                        "Please select an active membership plan"
                    );
                    error.statusCode = 400;
                    throw error;
                }

                const duration = Number(plan.duration);

                if (!Number.isFinite(duration) || duration <= 0) {
                    const error = new Error(
                        "Membership plan duration is invalid"
                    );
                    error.statusCode = 400;
                    throw error;
                }

                // 6. Calculate renewal dates
                const currentExpiry =
                    new Date(currentMembership.expiryDate);

                const renewalStart =
                    currentExpiry > now ? currentExpiry : now;

                const newExpiry = new Date(renewalStart);

                // Duration is measured in days
                newExpiry.setDate(
                    newExpiry.getDate() + duration
                );

                // 7. Preserve the previous membership record
                currentMembership.status = "expired";

                await currentMembership.save({ session });

                // 8. Create the renewed membership
                const createdMembership = await Membership.create(
                    [{
                        user: currentMembership.user,
                        plan: plan.name,
                        planId: plan._id,
                        status: "active",
                        startDate: renewalStart,
                        expiryDate: newExpiry
                    }],
                    { session }
                );

                renewedMembership = createdMembership[0];
            });

            // 9. Populate details after transaction succeeds
            await renewedMembership.populate("planId");
            await renewedMembership.populate(
                "user",
                "name email role"
            );

            return res.status(201).json({
                message: "Membership renewed successfully",
                membership: renewedMembership
            });

               } catch (error) {
            console.error("Renew membership error:", error);

            return res.status(error.statusCode || 500).json({
                message: error.statusCode
                    ? error.message
                    : "Server error while renewing membership"
            });

        } finally {
            if (session) {
                await session.endSession();
            }
        }
    }
);

// ======================================================
// GET ALL MEMBERSHIPS - ADMIN ONLY
// ======================================================

app.get("/api/admin/memberships", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const memberships = await Membership.find()
            .populate("user", "name email role")
            .populate("planId", "name price duration description features active")
            .sort({ createdAt: -1 });

        const now = new Date();
        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        const membershipData = memberships.map((membership) => {
            const data = membership.toObject();
            const expiryDate = new Date(data.expiryDate);

            let displayStatus = data.status;

            if (
                displayStatus !== "cancelled" &&
                !isNaN(expiryDate.getTime()) &&
                now >= expiryDate
            ) {
                displayStatus = "expired";
            }

            const remainingDays = Math.max(
                0,
                Math.ceil((expiryDate.getTime() - now.getTime()) / millisecondsPerDay)
            );

            const expiryStatus =
                displayStatus === "active" && remainingDays <= 7
                    ? "expiring_soon"
                    : displayStatus;

            return { ...data, displayStatus, remainingDays, expiryStatus };
        });

        return res.json({
            message: "All memberships fetched successfully",
            count: membershipData.length,
            memberships: membershipData
        });
    } catch (error) {
        console.error("Admin get memberships error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
);


// ======================================================
// GET ACTIVE TRAINERS - CUSTOMER
// Keep ONLY ONE GET /api/trainers route
// ======================================================

app.get("/api/trainers", authMiddleware, async (req, res) => {
    try {
        const trainers = await Trainer.find({ status: "active" })
            .select("name email specialization experience availability bio status")
            .sort({ name: 1 });

        return res.json({
            message: "Active trainers fetched successfully",
            count: trainers.length,
            trainers
        });
    } catch (error) {
        console.error("Get active trainers error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// CREATE TRAINER - ADMIN ONLY
// ======================================================

app.post("/api/admin/trainers", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            name, email, phone, specialization,
            experience, availability, bio
        } = req.body;

        if (
            !name?.trim() ||
            !email?.trim() ||
            !phone?.trim() ||
            !specialization?.trim() ||
            experience === undefined ||
            !availability?.trim()
        ) {
            return res.status(400).json({
                message: "Please fill all required trainer fields"
            });
        }

        const experienceNumber = Number(experience);

        if (!Number.isFinite(experienceNumber) || experienceNumber < 0) {
            return res.status(400).json({
                message: "Experience must be a valid non-negative number"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingTrainer = await Trainer.findOne({
            email: normalizedEmail
        });

        if (existingTrainer) {
            return res.status(409).json({
                message: "Trainer with this email already exists"
            });
        }

        const trainer = await Trainer.create({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            specialization: specialization.trim(),
            experience: experienceNumber,
            availability: availability.trim(),
            bio: bio?.trim() || "",
            status: "active"
        });

        return res.status(201).json({
            message: "Trainer created successfully",
            trainer
        });
    } catch (error) {
        console.error("Create trainer error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// GET ALL TRAINERS - ADMIN ONLY
// ======================================================

app.get("/api/admin/trainers", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const trainers = await Trainer.find().sort({ createdAt: -1 });

        return res.json({
            message: "Trainers fetched successfully",
            count: trainers.length,
            trainers
        });
    } catch (error) {
        console.error("Get admin trainers error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// GET SINGLE TRAINER - ADMIN ONLY
// ======================================================

app.get("/api/admin/trainers/:trainerId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { trainerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trainerId)) {
            return res.status(400).json({ message: "Invalid trainer ID" });
        }

        const trainer = await Trainer.findById(trainerId);

        if (!trainer) {
            return res.status(404).json({ message: "Trainer not found" });
        }

        return res.json({
            message: "Trainer fetched successfully",
            trainer
        });
    } catch (error) {
        console.error("Get trainer error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// UPDATE TRAINER - ADMIN ONLY
// ======================================================

app.put("/api/admin/trainers/:trainerId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { trainerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trainerId)) {
            return res.status(400).json({ message: "Invalid trainer ID" });
        }

        const trainer = await Trainer.findById(trainerId);

        if (!trainer) {
            return res.status(404).json({ message: "Trainer not found" });
        }

        const {
            name, email, phone, specialization,
            experience, availability, bio, status
        } = req.body;

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({ message: "Trainer name cannot be empty" });
            }
            trainer.name = name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== "string" || !email.trim()) {
                return res.status(400).json({ message: "Email cannot be empty" });
            }

            const normalizedEmail = email.toLowerCase().trim();

            const existingTrainer = await Trainer.findOne({
                email: normalizedEmail,
                _id: { $ne: trainerId }
            });

            if (existingTrainer) {
                return res.status(409).json({
                    message: "Another trainer already uses this email"
                });
            }

            trainer.email = normalizedEmail;
        }

        if (phone !== undefined) {
            if (typeof phone !== "string" || !phone.trim()) {
                return res.status(400).json({ message: "Phone cannot be empty" });
            }
            trainer.phone = phone.trim();
        }

        if (specialization !== undefined) {
            if (typeof specialization !== "string" || !specialization.trim()) {
                return res.status(400).json({
                    message: "Specialization cannot be empty"
                });
            }
            trainer.specialization = specialization.trim();
        }

        if (experience !== undefined) {
            const experienceNumber = Number(experience);

            if (!Number.isFinite(experienceNumber) || experienceNumber < 0) {
                return res.status(400).json({
                    message: "Experience must be a valid non-negative number"
                });
            }

            trainer.experience = experienceNumber;
        }

        if (availability !== undefined) {
            if (typeof availability !== "string" || !availability.trim()) {
                return res.status(400).json({
                    message: "Availability cannot be empty"
                });
            }
            trainer.availability = availability.trim();
        }

        if (bio !== undefined) {
            trainer.bio = typeof bio === "string" ? bio.trim() : "";
        }

        if (status !== undefined) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({
                    message: "Status must be active or inactive"
                });
            }
            trainer.status = status;
        }

        await trainer.save();

        return res.json({
            message: "Trainer updated successfully",
            trainer
        });
    } catch (error) {
        console.error("Update trainer error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// ACTIVATE / DEACTIVATE TRAINER - ADMIN ONLY
// ======================================================

app.put("/api/admin/trainers/:trainerId/activate", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { trainerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trainerId)) {
            return res.status(400).json({ message: "Invalid trainer ID" });
        }

        const trainer = await Trainer.findByIdAndUpdate(
            trainerId,
            { status: "active" },
            { new: true, runValidators: true }
        );

        if (!trainer) {
            return res.status(404).json({ message: "Trainer not found" });
        }

        return res.json({ message: "Trainer activated successfully", trainer });
    } catch (error) {
        console.error("Activate trainer error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.put("/api/admin/trainers/:trainerId/deactivate", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { trainerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trainerId)) {
            return res.status(400).json({ message: "Invalid trainer ID" });
        }

        const trainer = await Trainer.findByIdAndUpdate(
            trainerId,
            { status: "inactive" },
            { new: true, runValidators: true }
        );

        if (!trainer) {
            return res.status(404).json({ message: "Trainer not found" });
        }

        return res.json({ message: "Trainer deactivated successfully", trainer });
    } catch (error) {
        console.error("Deactivate trainer error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// DELETE TRAINER - ADMIN ONLY
// ======================================================

app.delete("/api/admin/trainers/:trainerId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { trainerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(trainerId)) {
            return res.status(400).json({ message: "Invalid trainer ID" });
        }

        const trainer = await Trainer.findByIdAndDelete(trainerId);

        if (!trainer) {
            return res.status(404).json({ message: "Trainer not found" });
        }

        return res.json({
            message: "Trainer deleted successfully",
            trainerId
        });
    } catch (error) {
        console.error("Delete trainer error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// CREATE BOOKING - CUSTOMER
// ======================================================

app.post("/api/bookings", authMiddleware, async (req, res) => {
    try {
        const {
            trainer, program, bookingDate,
            startTime, endTime, notes
        } = req.body;

        if (!program || !bookingDate || !startTime || !endTime) {
            return res.status(400).json({
                message: "Program, booking date, start time and end time are required"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== "customer") {
            return res.status(403).json({
                message: "Only customers can create bookings"
            });
        }

        const activeMembership = await Membership.findOne({
            user: req.user.id,
            status: "active",
            expiryDate: { $gt: new Date() }
        });

        if (!activeMembership) {
            return res.status(403).json({
                message: "Active membership is required to create a booking"
            });
        }

        const selectedBookingDate = new Date(bookingDate);

        if (isNaN(selectedBookingDate.getTime())) {
            return res.status(400).json({ message: "Invalid booking date" });
        }

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const bookingDay = new Date(selectedBookingDate);
        bookingDay.setHours(0, 0, 0, 0);

        if (bookingDay < todayStart) {
            return res.status(400).json({
                message: "Booking date cannot be in the past"
            });
        }

        const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
            return res.status(400).json({
                message: "Start time and end time must use HH:MM format"
            });
        }

        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        if (startMinutes >= endMinutes) {
            return res.status(400).json({
                message: "Start time must be before end time"
            });
        }

        if (bookingDay.getTime() === todayStart.getTime()) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            if (startMinutes <= currentMinutes) {
                return res.status(400).json({
                    message: "Booking start time must be in the future"
                });
            }
        }

        let selectedTrainer = null;

        if (trainer) {
            if (!mongoose.Types.ObjectId.isValid(trainer)) {
                return res.status(400).json({ message: "Invalid trainer ID" });
            }

            selectedTrainer = await Trainer.findById(trainer);

            if (!selectedTrainer) {
                return res.status(404).json({ message: "Trainer not found" });
            }

            if (selectedTrainer.status !== "active") {
                return res.status(400).json({
                    message: "Selected trainer is inactive"
                });
            }
        }

        const dayStart = new Date(selectedBookingDate);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(selectedBookingDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existingBookings = await Booking.find({
            bookingDate: { $gte: dayStart, $lte: dayEnd },
            status: { $nin: ["cancelled", "completed"] }
        });

        function timesOverlap(existingBooking) {
            const [sh, sm] = existingBooking.startTime.split(":").map(Number);
            const [eh, em] = existingBooking.endTime.split(":").map(Number);

            const existingStart = sh * 60 + sm;
            const existingEnd = eh * 60 + em;

            return startMinutes < existingEnd && endMinutes > existingStart;
        }

        const customerOverlap = existingBookings.some((item) =>
            item.user.toString() === req.user.id.toString() && timesOverlap(item)
        );

        if (customerOverlap) {
            return res.status(409).json({
                message: "You already have another booking during this time"
            });
        }

        if (trainer) {
            const trainerOverlap = existingBookings.some((item) =>
                item.trainer &&
                item.trainer.toString() === trainer.toString() &&
                timesOverlap(item)
            );

            if (trainerOverlap) {
                return res.status(409).json({
                    message: "Selected trainer is already booked during this time"
                });
            }
        }

        const booking = await Booking.create({
            user: req.user.id,
            trainer: trainer || null,
            program: program.trim(),
            bookingDate: selectedBookingDate,
            startTime,
            endTime,
            status: "pending",
            notes: typeof notes === "string" ? notes.trim() : ""
        });

        return res.status(201).json({
            message: "Booking created successfully",
            booking
        });
    } catch (error) {
        console.error("Create booking error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// GET CUSTOMER BOOKINGS
// ======================================================

app.get("/api/bookings", authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate("trainer", "name email specialization")
            .sort({ bookingDate: -1 });

        return res.json({
            message: "Bookings fetched successfully",
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error("Get customer bookings error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// CANCEL OWN BOOKING - CUSTOMER
// ======================================================

app.put("/api/bookings/:bookingId/cancel", authMiddleware, async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ message: "Invalid booking ID" });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                message: "You can only cancel your own booking"
            });
        }

        if (["cancelled", "completed"].includes(booking.status)) {
            return res.status(400).json({
                message: `Booking cannot be cancelled because it is ${booking.status}`
            });
        }

        booking.status = "cancelled";
        await booking.save();

        return res.json({ message: "Booking cancelled successfully", booking });
    } catch (error) {
        console.error("Customer cancel booking error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// GET ALL BOOKINGS - ADMIN ONLY
// ======================================================

app.get("/api/admin/bookings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("user", "name email")
            .populate("trainer", "name email specialization")
            .sort({ bookingDate: -1 });

        return res.json({
            message: "All bookings fetched successfully",
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error("Admin get bookings error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// CONFIRM BOOKING - ADMIN ONLY
// ======================================================

app.put("/api/admin/bookings/:bookingId/confirm", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ message: "Invalid booking ID" });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (["cancelled", "completed"].includes(booking.status)) {
            return res.status(400).json({
                message: `A ${booking.status} booking cannot be confirmed`
            });
        }

        booking.status = "confirmed";
        await booking.save();

        return res.json({ message: "Booking confirmed successfully", booking });
    } catch (error) {
        console.error("Confirm booking error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// CANCEL BOOKING - ADMIN ONLY
// ======================================================

app.put("/api/admin/bookings/:bookingId/cancel", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ message: "Invalid booking ID" });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (["cancelled", "completed"].includes(booking.status)) {
            return res.status(400).json({
                message: `Booking cannot be cancelled because it is ${booking.status}`
            });
        }

        booking.status = "cancelled";
        await booking.save();

        return res.json({ message: "Booking cancelled successfully", booking });
    } catch (error) {
        console.error("Admin cancel booking error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// DELETE BOOKING - ADMIN ONLY
// ======================================================

app.delete("/api/admin/bookings/:bookingId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ message: "Invalid booking ID" });
        }

        const booking = await Booking.findByIdAndDelete(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        return res.json({
            message: "Booking deleted successfully",
            bookingId
        });
    } catch (error) {
        console.error("Delete booking error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// CREATE PLAN - ADMIN ONLY
// ======================================================

app.post("/api/plans", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { name, price, duration, description, features } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            price === undefined ||
            duration === undefined
        ) {
            return res.status(400).json({
                message: "Name, price and duration are required"
            });
        }

        const priceNumber = Number(price);
        const durationNumber = Number(duration);

        if (!Number.isFinite(priceNumber) || priceNumber < 0) {
            return res.status(400).json({ message: "Price must be a valid non-negative number" });
        }

        if (!Number.isInteger(durationNumber) || durationNumber <= 0) {
            return res.status(400).json({ message: "Duration must be a positive whole number of days" });
        }

        const normalizedName = name.trim();

        const existingPlan = await Plan.findOne({
            name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
        });

        if (existingPlan) {
            return res.status(409).json({ message: "Plan already exists" });
        }

        if (features !== undefined && !Array.isArray(features)) {
            return res.status(400).json({ message: "Features must be an array" });
        }

        const plan = await Plan.create({
            name: normalizedName,
            price: priceNumber,
            duration: durationNumber,
            description: description || "",
            features: features || [],
            active: true
        });

        return res.status(201).json({ message: "Plan created successfully", plan });
    } catch (error) {
        console.error("Create plan error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// GET ACTIVE PLANS
// ======================================================

app.get("/api/plans", authMiddleware, async (req, res) => {
    try {
        const plans = await Plan.find({ active: true }).sort({ price: 1 });

        return res.json({
            message: "Plans fetched successfully",
            count: plans.length,
            plans
        });
    } catch (error) {
        console.error("Get active plans error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

/* =========================================
   GET ALL PLANS - ADMIN ONLY
========================================= */

app.get(
    "/api/admin/plans",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const plans = await Plan.find().sort({ price: 1 });

            return res.json({
                message: "All plans fetched successfully",
                count: plans.length,
                plans
            });
        } catch (error) {
            console.error("Get all admin plans error:", error);

            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);




/* =========================================
   UPDATE PLAN - ADMIN ONLY
========================================= */

app.put(
    "/api/plans/:planId",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const { planId } = req.params;
            const { name, price, duration, description, features } = req.body;

            if (!mongoose.Types.ObjectId.isValid(planId)) {
                return res.status(400).json({
                    message: "Invalid plan ID"
                });
            }

            const plan = await Plan.findById(planId);

            if (!plan) {
                return res.status(404).json({
                    message: "Plan not found"
                });
            }

            if (name !== undefined) {
                if (typeof name !== "string" || !name.trim()) {
                    return res.status(400).json({
                        message: "Plan name is required"
                    });
                }

                const existingPlan = await Plan.findOne({
                    name: {
                        $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                        $options: "i"
                    },
                    _id: { $ne: planId }
                });

                if (existingPlan) {
                    return res.status(409).json({
                        message: "Another plan already uses this name"
                    });
                }

                plan.name = name.trim();
            }

            if (price !== undefined) {
                const priceNumber = Number(price);

                if (!Number.isFinite(priceNumber) || priceNumber < 0) {
                    return res.status(400).json({
                        message: "Price must be a valid non-negative number"
                    });
                }

                plan.price = priceNumber;
            }

            if (duration !== undefined) {
                const durationNumber = Number(duration);

                if (!Number.isInteger(durationNumber) || durationNumber <= 0) {
                    return res.status(400).json({
                        message: "Duration must be a positive whole number of days"
                    });
                }

                plan.duration = durationNumber;
            }

            if (description !== undefined) {
                if (typeof description !== "string") {
                    return res.status(400).json({
                        message: "Description must be text"
                    });
                }

                plan.description = description.trim();
            }

            if (features !== undefined) {
                if (
                    !Array.isArray(features) ||
                    !features.every(
                        feature => typeof feature === "string" && feature.trim()
                    )
                ) {
                    return res.status(400).json({
                        message: "Features must be an array of non-empty strings"
                    });
                }

                plan.features = features.map(feature => feature.trim());
            }

            await plan.save();

            return res.json({
                message: "Plan updated successfully",
                plan
            });
        } catch (error) {
            console.error("Update plan error:", error);

            if (error.code === 11000) {
                return res.status(409).json({
                    message: "Plan name already exists"
                });
            }

            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);


// ======================================================
// ACTIVATE / DEACTIVATE PLAN - ADMIN ONLY
// ======================================================

app.put("/api/plans/:planId/activate", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { planId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({ message: "Invalid plan ID" });
        }

        const plan = await Plan.findByIdAndUpdate(
            planId,
            { active: true },
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        return res.json({ message: "Plan activated successfully", plan });
    } catch (error) {
        console.error("Activate plan error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

app.put("/api/plans/:planId/deactivate", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { planId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({ message: "Invalid plan ID" });
        }

        const plan = await Plan.findByIdAndUpdate(
            planId,
            { active: false },
            { new: true, runValidators: true }
        );

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        return res.json({ message: "Plan deactivated successfully", plan });
    } catch (error) {
        console.error("Deactivate plan error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// GET ALL PLANS - ADMIN ONLY
// ======================================================

app.get("/api/plans/all", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const plans = await Plan.find().sort({ price: 1 });

        return res.json({
            message: "All plans fetched successfully",
            count: plans.length,
            plans
        });
    } catch (error) {
        console.error("Get all plans error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// GET ALL MEMBERS - ADMIN ONLY
// Search + status filter
// ======================================================

app.get("/api/admin/members", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const search = String(req.query.search || "").trim().toLowerCase();
        const status = String(req.query.status || "all");

        const users = await User.find({ role: "customer" })
            .select("-password")
            .sort({ createdAt: -1 });

        const memberships = await Membership.find()
            .populate("planId")
            .sort({ expiryDate: -1, createdAt: -1 });

        const latestMembershipMap = new Map();

        for (const membership of memberships) {
            const userId = membership.user.toString();

            if (!latestMembershipMap.has(userId)) {
                latestMembershipMap.set(userId, membership);
            }
        }

        const now = new Date();
        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        let members = users.map((user) => {
            const latestMembership = latestMembershipMap.get(user._id.toString());
            let membershipData = null;

            if (latestMembership) {
                const expiryDate = new Date(latestMembership.expiryDate);
                let membershipStatus = latestMembership.status;

                if (
                    membershipStatus !== "cancelled" &&
                    !isNaN(expiryDate.getTime()) &&
                    now >= expiryDate
                ) {
                    membershipStatus = "expired";
                }

                const remainingDays = Math.max(
                    0,
                    Math.ceil((expiryDate.getTime() - now.getTime()) / millisecondsPerDay)
                );

                const expiryStatus =
                    membershipStatus === "active" && remainingDays <= 7
                        ? "expiring_soon"
                        : membershipStatus;

                membershipData = {
                    membershipId: latestMembership._id,
                    plan: latestMembership.plan,
                    planId: latestMembership.planId,
                    status: membershipStatus,
                    startDate: latestMembership.startDate,
                    expiryDate: latestMembership.expiryDate,
                    remainingDays,
                    expiryStatus
                };
            }

            return {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                membership: membershipData
            };
        });

        if (search) {
            members = members.filter((member) =>
                (member.name || "").toLowerCase().includes(search) ||
                (member.email || "").toLowerCase().includes(search)
            );
        }

        if (status !== "all") {
            members = members.filter((member) => {
                if (!member.membership) {
                    return false;
                }

                if (status === "expiring_soon") {
                    return member.membership.expiryStatus === "expiring_soon";
                }

                return member.membership.status === status;
            });
        }

        return res.json({
            message: "Members fetched successfully",
            count: members.length,
            search,
            status,
            members
        });
    } catch (error) {
        console.error("Get admin members error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

/* =========================================
   ADMIN - DEACTIVATE / REACTIVATE MEMBER
========================================= */

app.patch(
    "/api/admin/members/:userId/status",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { isActive } = req.body;

            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    message: "Invalid member ID"
                });
            }

            if (typeof isActive !== "boolean") {
                return res.status(400).json({
                    message: "isActive must be true or false"
                });
            }

            const member = await User.findOne({
                _id: userId,
                role: "customer"
            });

            if (!member) {
                return res.status(404).json({
                    message: "Customer member not found"
                });
            }

            member.isActive = isActive;
            await member.save();

            return res.json({
                message: isActive
                    ? "Member reactivated successfully"
                    : "Member deactivated successfully",
                member: {
                    userId: member._id,
                    name: member.name,
                    email: member.email,
                    role: member.role,
                    isActive: member.isActive
                }
            });
        } catch (error) {
            console.error("Update member status error:", error);

            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);



// ======================================================
// GET MEMBER DETAILS - ADMIN ONLY
// ======================================================

app.get("/api/admin/members/:userId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await User.findOne({
            _id: userId,
            role: "customer"
        }).select("-password");

        if (!user) {
            return res.status(404).json({ message: "Member not found" });
        }

        const memberships = await Membership.find({ user: userId })
            .populate("planId")
            .sort({ createdAt: -1 });

        const now = new Date();
        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        const membershipHistory = memberships.map((membership) => {
            const expiryDate = new Date(membership.expiryDate);
            let displayStatus = membership.status;

            if (
                displayStatus !== "cancelled" &&
                !isNaN(expiryDate.getTime()) &&
                now >= expiryDate
            ) {
                displayStatus = "expired";
            }

            const remainingDays = Math.max(
                0,
                Math.ceil((expiryDate.getTime() - now.getTime()) / millisecondsPerDay)
            );

            const expiryStatus =
                displayStatus === "active" && remainingDays <= 7
                    ? "expiring_soon"
                    : displayStatus;

            return {
                membershipId: membership._id,
                plan: membership.plan,
                planId: membership.planId,
                status: displayStatus,
                expiryStatus,
                startDate: membership.startDate,
                expiryDate: membership.expiryDate,
                remainingDays,
                createdAt: membership.createdAt,
                updatedAt: membership.updatedAt
            };
        });

        const currentMembership =
            membershipHistory.find((item) => item.status === "active") || null;

        return res.json({
            message: "Member details fetched successfully",
            member: {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            },
            currentMembership,
            membershipHistory,
            membershipCount: membershipHistory.length
        });
    } catch (error) {
        console.error("Get member details error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});


// ======================================================
// START SERVER AFTER MONGODB CONNECTS
// ======================================================

if (!process.env.MONGO_URI) {
    console.error("MongoDB Connection Failed: MONGO_URI is missing in .env");
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully! ✅");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB Connection Failed ❌");
        console.error(error.message);
        process.exit(1);
    });