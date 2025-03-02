import JSON5 from "json5";
import { stringify } from "safe-stable-stringify";

export const JsonHelper = {
  parse: JSON5.parse,
  stringify,
};
