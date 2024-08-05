import { Compiler } from "webpack";
import fs from "fs";
import path from "path";
import { ExtendedCompilation, PLUGIN_NAME, PluginOptions } from "./constants";
import { getScoppedLogger } from "../logger";
import { compress } from "../core-extractor/ts/helpers";

const webpackLogger = getScoppedLogger("webpack");

class KombaiPlugin {
  options: PluginOptions;
  static pluginName: string;
  static loader: string;

  constructor(options: PluginOptions) {
    this.options = options;
  }
  apply(compiler: Compiler) {
    compiler.hooks.emit.tapAsync(
      PLUGIN_NAME,
      async (_compilation: ExtendedCompilation, callback) => {
        const compilation: ExtendedCompilation = _compilation;
        let resultContent = "";
        if (!compilation[PLUGIN_NAME]) {
          webpackLogger.warn(`webpack plugin: ${PLUGIN_NAME} was not used.`);
          callback();
          return;
        } else {
          resultContent = JSON.stringify(
            compilation[PLUGIN_NAME].resultContent,
            null,
            2,
          );
        }
        const outputPath =
          path.resolve(
            compiler.options.output.path ?? path.resolve(__dirname, "dist"),
            this.options.outputFileName,
          ) +
          (this.options.compress === false)
            ? ".json"
            : ".json.gz";
        webpackLogger.info(`Writing result to ${outputPath}`);
        const wriatableData =
          this.options.compress === false
            ? resultContent
            : new Uint8Array(await compress(resultContent));
        fs.writeFile(outputPath, wriatableData, (err) => {
          if (err) {
            webpackLogger.error(`Error writing to ${outputPath} : %O `, err);
            throw err;
          }
          callback();
        });
      },
    );
  }
}


KombaiPlugin.pluginName = PLUGIN_NAME;
KombaiPlugin.loader = require.resolve("./loader");

module.exports = KombaiPlugin;
