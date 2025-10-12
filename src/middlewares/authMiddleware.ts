import dotenv from "dotenv"
import { Role } from "@prisma/client"
import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { getJwtSecret } from "../utils/tokens.js"

dotenv.config()

export interface JwtPayload {
  id: number
  role: Role
}

export interface JwtRequest extends Request {
  user?: JwtPayload | null
}
interface VerifyTokenOptions {
  validityRequired?: boolean
}
export const verifyToken = ({
  validityRequired = true,
}: VerifyTokenOptions) => {
  return (req: JwtRequest, res: Response, next: NextFunction) => {
    const accessToken = req.cookies?.accessToken
    let decoded: JwtPayload | null = null
    if (accessToken?.trim()) {
      try {
        decoded = jwt.verify(accessToken, getJwtSecret()) as JwtPayload
      } catch {
        if (validityRequired) {
          return res.status(401).json({ message: "Token invalide ou expiré" })
        }
        decoded = null
      }
    }
    req.user = decoded && decoded.id ? decoded : null
    if (validityRequired) {
      if (!req.user) {
        return res.status(401).json({ message: "Utilisateur non authentifié" })
      }
    }
    next()
  }
}

export function verifyRoles(roles: Role[]) {
  return (req: JwtRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé" })
    }
    next()
  }
}
