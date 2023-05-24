// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

module.exports = {
	mode: 'production',
	devtool: 'inline-source-map',
	entry: {
		main: './src/index.ts'
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: 'index.min.js',
		libraryTarget: 'commonjs'
	},
	resolve: {
		extensions: ['.ts', '.js'],
		fallback: {
			crypto: require.resolve('crypto-browserify'),
			buffer: require.resolve('buffer')
		}
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: 'ts-loader'
			}
		]
	},
	plugins: []
};
