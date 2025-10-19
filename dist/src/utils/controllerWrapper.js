import { logger } from "../lib/log.js";
export function controllerWrapper(mdw) {
    return async (req, res, next) => {
        try {
            await mdw(req, res, next);
        }
        catch (error) {
            logger.error(error);
            res.status(500).json({
                error: "Unexpected server error. Please try again later.",
            });
        }
    };
}
