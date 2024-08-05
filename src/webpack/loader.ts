import path from "path";
import { Compilation, LoaderDefinitionFunction } from "webpack";
import { withCustomConfig } from "../core-extractor/ts/componentExtractor";
import { ExtendedCompilation, PLUGIN_NAME, PluginOptions } from "./constants";
import { getScoppedLogger } from "../logger";
import { ComponentDoc } from "../core-extractor/ts/types";
import { Documentation } from "react-docgen";

const webpackLogger = getScoppedLogger("webpack");

let tsConfigInfoLogged = false;
const tsConfigLogger = (tsconfigPath: string) => {
  webpackLogger.info(`Using tsconfig at ${tsconfigPath}`);
  tsConfigInfoLogged = true;
};

const loader: LoaderDefinitionFunction<{
  tsConfigPath?: string;
}> = async function (content) {
  const { tsConfigPath } = this.getOptions();
  const tsconfigPath =
    tsConfigPath ?? path.join(process.cwd(), "tsconfig.json");
  !tsConfigInfoLogged && tsConfigLogger(tsconfigPath);

  const parserTsx = withCustomConfig(tsconfigPath, {
    shouldExtractLiteralValuesFromEnum: true,
  });

  let resultContent: object[] = [];
  const filePath = this.resourcePath;
  webpackLogger.info(`Parsing ${filePath}`);
  const components: (ComponentDoc | Documentation)[] = [];
  if (filePath.endsWith("tsx")) {
    components.push(...parserTsx.parse(filePath));
  } else if (filePath.endsWith("jsx")) {
    const parse = await import("react-docgen").then((module) => module.parse);
    components.push(...parse(content));
  }
  resultContent.push({ [filePath.replace(process.cwd(), "")]: components });
  if (this._compilation) {
    const compilation: ExtendedCompilation = this._compilation;
    if (!compilation[PLUGIN_NAME]) {
      compilation[PLUGIN_NAME] = { resultContent: [] };
      webpackLogger.verbose(
        `Creating new compilation metadata for ${PLUGIN_NAME}`,
      );
    }
    compilation[PLUGIN_NAME].resultContent.push(...resultContent);
  } else {
    const err = "Something went wrong. Compilation not found!";
    webpackLogger.error(err);
    throw new Error(err);
  }
  return content;
};

export default loader;
