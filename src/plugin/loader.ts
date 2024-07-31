import path from "path";
import { Compilation, LoaderDefinitionFunction } from "webpack";
import { withCustomConfig } from "../core-extractor/componentExtractor";
import { PLUGIN_NAME } from "./constants";
export interface ExtendedCompilation extends Compilation {
  [PLUGIN_NAME]?: {
    resultContent: string;
  };
}

const loader: LoaderDefinitionFunction = function (content) {
  const filePath = this.resourcePath;

  const tsconfigPath = path.join(process.cwd(), "tsconfig.json");
  const parser = withCustomConfig(tsconfigPath, {
    shouldExtractLiteralValuesFromEnum: true,
  });

  // Construct the result content
  let resultContent = "";

  const componentFile = filePath;
  const components = parser.parse(componentFile);
  resultContent += `${JSON.stringify(components, null, 2)}\n`;

  if (this._compilation) {
    const compilation = this._compilation as ExtendedCompilation;
    if (!compilation[PLUGIN_NAME]) {
      compilation[PLUGIN_NAME] = { resultContent: "" };
    }
    compilation[PLUGIN_NAME].resultContent += resultContent;
  }

  // Pass the metadata to the Webpack compilation
  return content;
};

module.exports = loader;
