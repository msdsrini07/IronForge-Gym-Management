
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id).select("_id role isActive");

        if (!user) {
            return res.status(401).json({
                message: "User account not found."
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                message: "Your account has been deactivated."
            });
        }

        req.user = {
            id: user._id.toString(),
            role: user.role
        };

        next();

    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        console.error("Authentication error:", error);

        return res.status(500).json({
            message: "Authentication failed"
        });
    }
};

module.exports = authMiddleware;
