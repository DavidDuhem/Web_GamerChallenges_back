import { createLogger, format, transports } from "winston";
import { config } from "../../config.js";
export const logger = createLogger({
    level: config.server.logLevel,
    format: format.combine(format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), format.json()),
    transports: [
        new transports.Console({
            format: format.combine(format.colorize(), format.printf(({ level, message, timestamp, ...meta }) => {
                const metaStr = Object.keys(meta).length
                    ? `\n${JSON.stringify(meta, null, 2)}`
                    : "";
                return `${timestamp} [${level}]: ${message}${metaStr}`;
            })),
        }),
        new transports.File({
            level: "error",
            filename: "logs/error.log",
        }),
        new transports.File({
            filename: "logs/combined.log",
        }),
    ],
});
