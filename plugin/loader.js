const KombaiPlugin = require('./index');

function loader(content) {
	const filePath = this.resourcePath;

	// Example of processing the source and generating metadata
	const metadata = `/* Metadata for ${filePath} */\n`;

	// Attach the metadata to the source
	const modifiedContent = `${metadata}${content}`;

	if (
		this._compilation &&
		(!this._compilation.metadata || !this._compilation.metadata.hasOwnProperty(KombaiPlugin.pluginName))
	) {
		this._compilation.metadata = this._compilation.metadata || {
			[KombaiPlugin.pluginName]: {},
		};
	}
	// Pass the metadata to the Webpack compilation
	if (this._compilation) {
		this._compilation.metadata[KombaiPlugin.pluginName][filePath] = metadata;

		// Mark that this loader was used
	}
	this._compilation[KombaiPlugin.pluginName] = true;

	return modifiedContent;
}

module.exports = loader;
