import rateLimit from "express-rate-limit";
import { logger } from "../lib/log.js";
export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    limit: 100,
    standardHeaders: true, //Active les headers RateLimit-* qui permettent aux clients de connaître leur quota restant. Utile pour UX côté client.
    skipSuccessfulRequests: false, // Compte toutes les requêtes, même réussies
    handler: (req, res) => {
        logger.error(`IP bloquée: ${req.ip}`);
        res.status(429).json({
            status: 429,
            error: "Vous avez atteint la limite de requêtes. Réessayez plus tard.",
        });
    },
});
