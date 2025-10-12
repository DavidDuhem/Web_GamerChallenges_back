import BaseController from "../BaseController.js"
import type { Request, Response } from "express"
import { prisma } from "../../../prisma/index.js"
import { User } from "@prisma/client"
import { registerSchema, loginSchema } from "../../schemas/auth.schema.js"
import {
  generateAccessTokenOnly,
  generateAuthenticationTokens,
} from "../../utils/tokens.js"
import { JwtRequest } from "../../middlewares/authMiddleware.js"
import { config } from "../../../config.js"
import argon2 from "argon2"
import crypto from "node:crypto"
import { sendEmailForgotPassword } from "../../utils/emailSenderDev.js"

interface Token {
  token: string
  type: string
  expiresInMS: number
}

export default class AuthController extends BaseController<User, "user_id"> {
  constructor() {
    super(prisma.user, "user_id")
  }

  async login(req: Request, res: Response) {
    const { email, password } = await loginSchema.parseAsync(req.body)

    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
      return res.status(401).json({
        message: "Email et mot de passe ne correspondent pas",
      })
    }

    const isMatching = await argon2.verify(user.password, password)
    if (!isMatching) {
      return res.status(401).json({
        message: "Email et mot de passe ne correspondent pas",
      })
    }

    const accessToken = await generateAndSetTokens(res, user)

    return res.status(200).json({
      message: "Connecté avec succès",
      accessToken: accessToken,
      user: {
        id: user.user_id,
        pseudo: user.pseudo,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    })
  }

  async register(req: Request, res: Response) {
    const { pseudo, email, password, avatar, confirm } =
      await registerSchema.parseAsync(req.body)

    if (password !== confirm) {
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas" })
    }

    const alreadyExistingUser = await prisma.user.findMany({
      where: {
        OR: [{ email }, { pseudo }],
      },
      select: { email: true, pseudo: true },
    })

    const errors = alreadyExistingUser.reduce<Record<string, string>>(
      (acc, user) => {
        if (user.email === email) acc.email = "Email déjà utilisé"
        if (user.pseudo === pseudo) acc.pseudo = "Pseudo déjà utilisé"
        return acc
      },
      {}
    )

    if (Object.keys(errors).length) {
      return res.status(409).json({ errors })
    }

    const hashedPassword = await argon2.hash(password)

    const user = await this.create({
      pseudo,
      email,
      password: hashedPassword,
      avatar: avatar.trim(),
    })

    const accessToken = await generateAndSetTokens(res, user)

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      accessToken: accessToken,
      user: {
        id: user.user_id,
        pseudo: user.pseudo,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    })
  }

  async logout(req: Request, res: Response) {
    await deleteTokenAndCookies(req, res)
    res.sendStatus(204)
  }

  async me(req: JwtRequest, res: Response) {
    const user = await this.findById(Number(req.user!.id))
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" })
    }

    res.status(200).json({
      user: {
        id: user.user_id,
        pseudo: user.pseudo,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    })
  }

  async refreshAccessToken(req: Request, res: Response) {
    const rawToken = req.cookies?.refreshToken
    if (!rawToken) {
      return res.status(401).json({ message: "Refresh Token non reçu" })
    }

    const existingRefreshToken = await prisma.token.findFirst({
      where: { token: rawToken },
      include: { user: true },
    })
    if (!existingRefreshToken) {
      return res.status(401).json({ message: "Refresh Token invalide" })
    }

    if (existingRefreshToken.expired_at < new Date()) {
      await prisma.token.delete({
        where: { id: existingRefreshToken.id },
      })
      return res.status(401).json({ message: "Refresh Token expiré" })
    }

    const accessToken = generateAccessTokenOnly(existingRefreshToken.user)
    setAccessTokenCookie(res, accessToken)

    res.status(200).json({ accessToken })
  }

  async softDeleteUser(req: JwtRequest, res: Response) {
    const userId = Number(req.params.userId)

    if (userId !== req.user!.id) {
      return res.status(403).json({ message: "Action non autorisée" })
    }

    const randomHash = await argon2.hash(Math.random().toString())

    await this.update(userId, {
      pseudo: `deleted_user(${userId})`,
      email: `deleted_user_${userId}_${Date.now()}@deleted.com`,
      password: randomHash,
      avatar: "",
      deleted_at: new Date(),
    })

    await deleteTokenAndCookies(req, res)

    res.sendStatus(204)
  }

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(200).json({
        message:
          "Un lien de réinitialisation a été envoyé sur l'email renseigné",
      })
    }

    const forgotPasswordToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.token.create({
      data: {
        token: forgotPasswordToken,
        token_type: "forgot_pswd",
        user_id: user.user_id,
        issued_at: new Date(),
        expires_at: expiresAt,
      },
    })

    await sendEmailForgotPassword({
      userEmail: user.email,
      token: forgotPasswordToken,
    })

    res.json({
      message: "Un lien de réinitialisation a été envoyé sur l'email renseigné",
    })
  }

  async resetPassword(req: Request, res: Response) {
    const { token, password, confirm } = req.body

    if (password !== confirm) {
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas" })
    }

    console.log(req.body)

    const resetToken = await prisma.token.findUnique({ where: { token } })

    if (!resetToken || resetToken.expires_at < new Date()) {
      res.status(400).json({ message: "Token invalide ou expiré" })
    }

    const hashedPassword = await argon2.hash(password)

    await prisma.user.update({
      where: { user_id: resetToken.user_id },
      data: { password: hashedPassword },
    })

    await prisma.token.delete({ where: { id: resetToken.id } })

    res.json({
      message: "Mot de passe réinitialisé, vous pouvez vous connecter",
    })
  }
}

async function generateAndSetTokens(res: Response, user: User) {
  const { accessToken, refreshToken } = generateAuthenticationTokens(user)

  await replaceRefreshTokenInDatabase(refreshToken, user)

  setAccessTokenCookie(res, accessToken)
  setRefreshTokenCookie(res, refreshToken)

  return accessToken
}

async function replaceRefreshTokenInDatabase(refreshToken: Token, user: User) {
  await prisma.token.deleteMany({
    where: { user_id: user.user_id, token_type: "refresh" },
  })
  await prisma.token.create({
    data: {
      token: refreshToken.token,
      user_id: user.user_id,
      token_type: "refresh",
      issued_at: new Date(),
      expires_at: new Date(new Date().valueOf() + refreshToken.expiresInMS),
    },
  })
}

function setAccessTokenCookie(res: Response, accessToken: Token) {
  res.cookie("accessToken", accessToken.token, {
    httpOnly: true,
    maxAge: accessToken.expiresInMS,
    secure: config.server.secure,
    sameSite: "lax",
  })
}

function setRefreshTokenCookie(res: Response, refreshToken: Token) {
  res.cookie("refreshToken", refreshToken.token, {
    httpOnly: true,
    maxAge: refreshToken.expiresInMS,
    secure: config.server.secure,
    sameSite: "lax",
    path: "/api/auth/",
  })
}

async function deleteTokenAndCookies(req: Request, res: Response) {
  const rawToken = req.cookies?.refreshToken
  if (rawToken) {
    await prisma.token.deleteMany({ where: { token: rawToken } })
  }

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: config.server.secure,
    sameSite: "lax",
  })

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.server.secure,
    sameSite: "lax",
    path: "/api/auth/",
  })
}
