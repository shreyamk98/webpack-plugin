import { Compilation, Compiler, LoaderDefinitionFunction } from "webpack";
import { ExtendedCompilation } from "./loader";
import fs from "fs";
import path from "path";
import { PLUGIN_NAME } from "./constants";

interface PluginOptions {
  outputFile: string;
}

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
      (_compilation: ExtendedCompilation, callback) => {
        const compilation = _compilation as ExtendedCompilation;
        let resultContent = "";
        if (!compilation[PLUGIN_NAME]) {
          console.warn("CustomPlugin: custom-loader was not used.");
          callback();
          return;
        } else {
          resultContent = compilation[PLUGIN_NAME].resultContent;
        }

        // Construct the result content

        const outputPath = path.resolve(
          // TODO See the outpath
          compiler.options.output.path ?? path.resolve(__dirname, "dist"),
          this.options.outputFile,
        );
        fs.writeFile(outputPath, resultContent, (err) => {
          if (err) throw err;
          console.log(`Metadata written to ${outputPath}`);
          callback();
        });
      },
    );
  }
}

KombaiPlugin.pluginName = PLUGIN_NAME;
KombaiPlugin.loader = require.resolve("./loader");

module.exports = KombaiPlugin;
