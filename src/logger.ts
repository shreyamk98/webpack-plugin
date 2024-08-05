import debug from "debug";
// trace, debug, info,
const logLevel = process.env.LOG_LEVEL as string | undefined;
const PRODUCT = "storybook";
const error = debug(`${PRODUCT}:error`);
const warn = debug(`${PRODUCT}:warn`);
const info = debug(`${PRODUCT}:info`);
const verbose = debug(`${PRODUCT}:verbose`);
switch (logLevel) {
  case "0":
    debug.disable();
    break;
  case "1":
    debug.enable(`${PRODUCT}:error:* ${PRODUCT}:warn:*`);
    break;
  case "2":
    debug.enable(`${PRODUCT}:error:* ${PRODUCT}:warn:* ${PRODUCT}:info:*`);
    break;
  case "3":
    debug.enable(`${PRODUCT}:*`);
    break;
  default:
    debug.enable(`${PRODUCT}:error:* ${PRODUCT}:warn:*`);
}

export function getScoppedLogger(namespace: string) {
  return {
    error: error.extend(namespace),
    warn: warn.extend(namespace),
    info: info.extend(namespace),
    verbose: verbose.extend(namespace),
  };
}
