module.exports = {
	env          : {
		browser: true,
		es2021 : true,
		node   : true
	},
	'extends'    : [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/eslint-recommended',
	],
	parser       : '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType : 'module'
	},
	plugins      : [
		'@typescript-eslint',
		'smarter-tabs'
	],
	rules        : {
		'@typescript-eslint/no-explicit-any'    : ['off'],
		'@typescript-eslint/no-unused-vars'     : ['off'],
		'@typescript-eslint/no-this-alias'      : ['off'],
		'@typescript-eslint/no-namespace'       : ['off'],
		'@typescript-eslint/no-inferrable-types': ['off'],
		'@typescript-eslint/ban-types'          : ['off'],
		'smarter-tabs/smarter-tabs'             : ['warn'],
		'prefer-const'                          : ['off'],
		'no-mixed-spaces-and-tabs'              : ['off'],
		quotes                                  : ['error', 'single'],
		semi                                    : ['error', 'always']
	}
};