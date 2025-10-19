import { Router } from "express"
import { controllerWrapper as cw } from "../utils/controllerWrapper.js"
import AuthController from "../controllers/AuthController/AuthController.js"
import { verifyToken } from "../middlewares/authMiddleware.js"

const router = Router()
const authController = new AuthController()

router.post(
  "/register",
  cw((req, res) => authController.register(req, res))
)

router.post(
  "/login",
  cw((req, res) => authController.login(req, res))
)

router.post(
  "/logout",
  cw((req, res) => authController.logout(req, res))
)

router.get(
  "/me",
  verifyToken({ validityRequired: true }),
  cw((req, res) => authController.me(req, res))
)

router.post(
  "/refresh",
  cw((req, res) => authController.refreshAccessToken(req, res))
)

router.post(
  "/forgot-password",
  cw((req, res) => authController.forgotPassword(req, res))
)

router.post(
  "/reset-password",
  cw((req, res) => authController.resetPassword(req, res))
)

router.patch(
  "/delete/:userId",
  verifyToken({ validityRequired: true }),
  cw((req, res) => authController.softDeleteUser(req, res))
)

export default router
