import morgan from "morgan"
import { logger } from "../lib/log.js"

export const loggerMiddleware = morgan(
  function (tokens, req, res) {
    return JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status_code: Number.parseFloat(tokens.status(req, res) || "0"),
      content_length: tokens.res(req, res, "content-length"),
      response_time: Number.parseFloat(
        tokens["response-time"](req, res) || "0"
      ),
      user_agent: tokens["user-agent"](req, res),
      ip: "ip" in req ? req.ip : req.socket.remoteAddress,
      userId: "userId" in req ? req.userId : undefined,
      userRole: "userRole" in req ? req.userRole : undefined,
    })
  },
  {
    stream: {
      write: (message) => {
        const data = JSON.parse(message.trim())
        if (data.status_code >= 500) {
          logger.error("HTTP Request", data)
        } else if (data.status_code >= 400) {
          logger.warn("HTTP Request", data)
        } else {
          logger.http("HTTP Request", data)
        }
      },
    },
  }
)
