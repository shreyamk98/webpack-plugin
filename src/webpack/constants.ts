import { Compilation } from "webpack";

export const PLUGIN_NAME = "kombai-plugin";

export interface PluginOptions {
  outputFileName: string;
  compress?: boolean;
}

export interface ExtendedCompilation extends Compilation {
  [PLUGIN_NAME]?: { resultContent: object[] };
}
