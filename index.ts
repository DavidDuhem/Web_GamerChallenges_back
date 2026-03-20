import { config } from "./config.js"
import { app } from "./src/app.js"
import { logger } from "./src/lib/log.js"

const port = config.server.port
app.listen(port, "0.0.0.0", () => {
  logger.info(`🚀 Server started at http://localhost:${port}`)
})
