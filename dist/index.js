import { config } from "./config.js";
import { app } from "./src/app.js";
import { logger } from "./src/lib/log.js";
const port = config.server.port;
app.listen(port, () => {
    logger.info(`🚀 Server started at http://localhost:${port}`);
});
