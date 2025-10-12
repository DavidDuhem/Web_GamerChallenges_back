import { Router } from "express"
import swaggerJSDoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"
import authRoutes from "./routes/auth.routes.js"
import challengeRoutes from "./routes/challenge.route.js"
import entryRoutes from "./routes/entry.routes.js"
import gameRoutes from "./routes/game.routes.js"

export const router = Router()

//Routes
router.use("/auth", authRoutes)
router.use("/challenges", challengeRoutes)
router.use("/entries", entryRoutes)
router.use("/games", gameRoutes)

const spec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Gamer-Challenges",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:5000/api",
        description: "Development server",
      },
    ],
  },
  apis: ["./src/docs/openapi.yml"],
})

router.use("/docs", swaggerUi.serve, swaggerUi.setup(spec))

//Default 404
router.use((req, res) => {
  res.status(404).json({ error: "Not found" })
})
