import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/tokens.js";
dotenv.config();
export const verifyToken = ({ validityRequired = true, }) => {
    return (req, res, next) => {
        const accessToken = req.cookies?.accessToken;
        let decoded = null;
        if (accessToken?.trim()) {
            try {
                decoded = jwt.verify(accessToken, getJwtSecret());
            }
            catch {
                if (validityRequired) {
                    return res.status(401).json({ message: "Token invalide ou expiré" });
                }
                decoded = null;
            }
        }
        req.user = decoded && decoded.id ? decoded : null;
        if (validityRequired) {
            if (!req.user) {
                return res.status(401).json({ message: "Utilisateur non authentifié" });
            }
        }
        next();
    };
};
export function verifyRoles(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Utilisateur non authentifié" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Accès refusé" });
        }
        next();
    };
}
