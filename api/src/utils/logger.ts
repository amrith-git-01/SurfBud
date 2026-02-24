import pino from "pino";

const IS_DEV = process.env["NODE_ENV"] !== "production";

export const logger = pino(
  {
    level: IS_DEV ? "debug" : "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  },
  IS_DEV
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          messageFormat: "{msg}",
          levelFirst: false,
          singleLine: false,
        },
      })
    : undefined,
);
