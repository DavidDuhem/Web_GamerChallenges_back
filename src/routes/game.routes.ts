import { Router } from "express"
import GameController from "../controllers/GameController/GameController.js"

const router = Router()
const gameController = new GameController()

router.get("/", (req, res) => gameController.getAllGames(req, res))

export default router
