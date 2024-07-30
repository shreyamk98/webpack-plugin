const ts = require('typescript');
const path = require('path');
const fs = require('fs');
const { withCustomConfig } = require('./componentExtractor');

const pluginName = 'kombai-plugin';

class KombaiPlugin {
	constructor(options = {}) {
		this.options = options;
	}

	apply(compiler) {
		compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
			if (!compilation[pluginName]) {
				console.warn('CustomPlugin: custom-loader was not used.');
				callback();
				return;
			}

			const metadata = compilation.metadata[pluginName] || {};
			const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
			const parser = withCustomConfig(tsconfigPath, {
				shouldExtractLiteralValuesFromEnum: true,
				propFilter: (prop) => {
				return true;
				},
				});

			// Construct the result content
			let resultContent = '';
			for (const [filePath, data] of Object.entries(metadata)) {
				const componentFile = filePath;
				const components = parser.parse(componentFile);
				resultContent += `${JSON.stringify(components)}\n`;
			}

			// Write the result content to the specified output file
			const outputPath = path.resolve(compiler.options.output.path, this.options.outputFile);
			fs.writeFile(outputPath, resultContent, (err) => {
				if (err) throw err;
				console.log(`Metadata written to ${outputPath}`);
				callback();
			});
		});
	}
}

KombaiPlugin.pluginName = pluginName;
KombaiPlugin.loader = require.resolve('./loader');

module.exports = KombaiPlugin;
