import crypto from "node:crypto"
import jwt from "jsonwebtoken"
import { User } from "@prisma/client"
import { config } from "../../config.js"
import z from "zod"
import { JwtPayload } from "../middlewares/authMiddleware.js"
import { logger } from "../lib/log.js"
const jwtPayloadSchema = z.object({
  id: z.number().int().min(1),
  role: z.string(),
})
export type ValidatedJwtPayload = z.infer<typeof jwtPayloadSchema>

export function generateAuthenticationTokens(user: User) {
  const payload = {
    id: user.user_id,
    role: user.role,
  }

  const JWT_SECRET = config.server.jwtSecret
  if (!JWT_SECRET) {
    throw new Error("JWT SECRET KEY is not defined in .env")
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  })

  const refreshToken = crypto.randomBytes(128).toString("base64")

  return {
    accessToken: {
      token: accessToken,
      type: "Bearer",
      expiresInMS: 1 * 60 * 60 * 1000, // 1h
    },
    refreshToken: {
      token: refreshToken,
      type: "Bearer",
      expiresInMS: 7 * 24 * 60 * 60 * 1000, // 7j
    },
  }
}
export function generateAccessTokenOnly(user: User) {
  const payload = {
    id: user.user_id,
    role: user.role,
  }

  const JWT_SECRET = config.server.jwtSecret
  if (!JWT_SECRET) {
    throw new Error("JWT SECRET KEY is not defined in .env")
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  })

  return {
    token: accessToken,
    type: "Bearer",
    expiresInMS: 1 * 60 * 60 * 1000, // 1h
  }
}

export function getJwtSecret() {
  const JWT_SECRET = config.server.jwtSecret
  if (!JWT_SECRET) {
    throw new Error("JWT SECRET KEY is not defined in .env")
  }

  return JWT_SECRET
}

export function decodeJwt(token: string): ValidatedJwtPayload | null {
  if (!token || token.trim() === "") {
    return null
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload
    const validationResult = jwtPayloadSchema.safeParse(decoded)

    if (validationResult.success) {
      return validationResult.data
    }
    logger.error("Token payload invalide:", validationResult.error)
    return null
  } catch (error) {
    logger.error("Erreur décodage token:", error)
    return null
  }
}
