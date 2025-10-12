import type { Request, Response, NextFunction, RequestHandler } from "express"
import { logger } from "../lib/log.js"

export function controllerWrapper(mdw: RequestHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await mdw(req, res, next)
    } catch (error) {
      logger.error(error)
      res.status(500).json({
        error: "Unexpected server error. Please try again later.",
      })
    }
  }
}
