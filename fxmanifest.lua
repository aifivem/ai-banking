name 'ai-banking'
author 'TGIANN'
version '0.1.0'
license 'GPL-3.0-only'
description 'Banking: accounts, deposits, withdrawals, transfers, history, ATMs'
repository 'https://github.com/aifivem/ai-banking'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'dist/web/assets/*.css',
	'dist/web/assets/*.js',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/*.html',
	'data/settings.json',
	'data/banks.json',
}
provide 'qb-banking'
provide 'Renewed-Banking'
