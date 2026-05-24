import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
	{
		ignores: ['dist']
	},
	{
		files: ['**/*.{js,jsx}'],
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
		},
		plugins: { 
			'react-hooks': reactHooks, 
			'react-refresh': reactRefresh
		},
		rules: {
			'no-unused-vars': 'off',
			'react-hooks/rules-of-hooks': 'warn',
			'react-hooks/exhaustive-deps': 'off',
			'react-refresh/only-export-components': 'off',
		},
	},
]