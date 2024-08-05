import { PluginOption } from "vite";
import { withCustomConfig } from "../core-extractor/ts/componentExtractor";
import { ComponentDoc } from "../core-extractor/ts/types";
import { getScoppedLogger } from "../logger";
import { compress } from "../core-extractor/ts/helpers";

interface KombaiRollupPluginOptions {
  tsconfigPath?: string;
  outputFile?: string;
  doCompress?: boolean;
}

const DEFAULT_TSCONFIG_PATH = "./tsconfig.json";

const rollupLogger = getScoppedLogger("rollup");

const kombaiPlugin = ({
  tsconfigPath = DEFAULT_TSCONFIG_PATH,
  outputFile = "componentInfo.json",
  doCompress = true,
}: KombaiRollupPluginOptions = {}): PluginOption => {
  const componentsDocs: ComponentDoc[] = [];
  return {
    name: "kombai-plugin",
    buildStart() {
      if (tsconfigPath === DEFAULT_TSCONFIG_PATH) {
        rollupLogger.warn(
          `rollup: tsconfigPath is not provided, using default tsconfig.json`,
        );
      }
    },
    transform(code, id) {
      if (id.endsWith(".tsx")) {
        rollupLogger.info(`Parsing ${id}`);
        this.info(`Parsing ${id}`);
        const parser = withCustomConfig(tsconfigPath, {
          shouldExtractLiteralValuesFromEnum: true,
          propFilter: (prop) => {
            return true;
          },
        });
        componentsDocs.push(...parser.parse(id));
      }
      return {
        code,
      };
    },

    async generateBundle(options, bundle) {
      const outputFileName = outputFile + (doCompress ? ".gz" : "");
      if (componentsDocs.length > 0) {
        const resultContent = JSON.stringify(componentsDocs, null, 2);
        const wriatableData =
          doCompress === false
            ? resultContent
            : new Uint8Array(await compress(resultContent));
        bundle[outputFileName] = {
          fileName: outputFileName,
          source: wriatableData,
          name: outputFileName,
          type: "asset",
          needsCodeReference: false,
        };
        rollupLogger.info(`Generated ${outputFile}`);
      }
    },
  };
};

export default kombaiPlugin;
