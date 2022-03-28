const path = require('path');

module.exports = {
	mode   : 'production',
	devtool: 'inline-source-map',
	entry  : {
		main: './src/index.ts',
	},
	output : {
		path         : path.resolve(__dirname, './dist'),
		filename     : 'index.min.js',
		libraryTarget: 'commonjs'
	},
	resolve: {
		extensions: ['.ts', '.js'],
		fallback  : {
			crypto: false
		}
	},
	module : {
		rules: [
			{
				test  : /\.ts$/,
				loader: 'ts-loader'
			}
		]
	},
	plugins: []
};
