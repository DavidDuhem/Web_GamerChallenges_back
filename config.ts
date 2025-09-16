export const config = {
    server: {
      port: parseInt(process.env.PORT || "3000"),
      allowedOrigins: process.env.ALLOWED_ORIGINS || "*",
      secure: process.env.NODE_ENV === "production" || false,
      logLevel: process.env.LOG_LEVEL || "info",
    }
};