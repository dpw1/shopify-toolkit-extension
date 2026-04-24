
D:\Web Dev\ChromeExtension\shopify-theme-wizard>npm start

> shopify-app-detector-by-ezfy@1.3.2 start
> node --openssl-legacy-provider utils/webserver.js

1% setup initialize(node:9156) Warning: `--localstorage-file` was provided without a valid path
(Use `node --trace-warnings ...` to show where the warning was created)
10% building 0/1 entries 0/0 dependencies 0/0 modules× ｢wds｣:  Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:2016:16)
    at listenInCluster (node:net:2073:12)
    at Server.listen (node:net:2178:7)
    at Server.listen (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\webpack-dev-server\lib\Server.js:777:30)
    at Object.<anonymous> (D:\Web Dev\ChromeExtension\shopify-theme-wizard\utils\webserver.js:50:8)
    at Module._compile (node:internal/modules/cjs/loader:1811:14)
    at Object..js (node:internal/modules/cjs/loader:1942:10)
    at Module.load (node:internal/modules/cjs/loader:1532:32)
    at Module._load (node:internal/modules/cjs/loader:1334:12)
    at wrapModuleLoad (node:internal/modules/cjs/loader:255:19) {
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '::',
  port: 3000
}
10% building 0/44 entries 34/47 dependencies 0/9 modulesBrowserslist: caniuse-lite is outdated. Please run:
npx browserslist@latest --update-db

Why you should do it regularly:
https://github.com/browserslist/browserslist#browsers-data-updating
99% done plugins clean-webpack-pluginclean-webpack-plugin: pausing due to webpack errors
× ｢wdm｣: assets by path *.js 6.87 MiB 8 assets
assets by path *.html 1.13 KiB
  asset newtab.html 282 bytes [emitted]
  asset panel.html 236 bytes [emitted]
  asset options.html 231 bytes [emitted]
  asset popup.html 221 bytes [emitted]
  asset devtools.html 184 bytes [emitted]
assets by path *.png 23.6 KiB
  asset icon-128.png 17.9 KiB [emitted] [from: src/assets/img/icon-128.png] [copied] (auxiliary name: popup)
  asset icon-34.png 3.27 KiB [emitted] [from: src/assets/img/icon-34.png] [copied]
  asset ezfy-logo-small.png 2.5 KiB [emitted] [from: src/assets/img/ezfy-logo-small.png] (auxiliary name: popup)
asset manifest.json 641 bytes [emitted] [from: src/manifest.json] [copied]
asset content.styles.css 0 bytes [emitted] [from: src/pages/Content/content.styles.css] [copied]
runtime modules 197 KiB 93 modules
orphan modules 169 bytes [orphan] 1 module
modules by path ./node_modules/ 1.65 MiB 153 modules
modules by path ./src/ 266 KiB
  modules by path ./src/pages/ 263 KiB 48 modules
  modules by path ./src/assets/img/*.png 119 bytes
    ./src/assets/img/ezfy-logo-small.png 63 bytes [built] [code generated]
    ./src/assets/img/icon-128.png 56 bytes [built] [code generated]
  ./src/containers/Greetings/Greetings.jsx 3.34 KiB [built] [code generated]
./util.inspect (ignored) 15 bytes [built] [code generated]

ERROR in ./src/pages/Newtab/Newtab.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Newtab/Newtab.css)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Newtab/Newtab.css 2:12-168 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Newtab/Newtab.jsx 14:0-22
 @ ./src/pages/Newtab/index.jsx 9:0-30 11:41-47

ERROR in ./src/pages/Newtab/Newtab.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Newtab/Newtab.css)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Newtab/Newtab.css 2:12-168 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Newtab/Newtab.jsx 14:0-22
 @ ./src/pages/Newtab/index.jsx 9:0-30 11:41-47

ERROR in ./src/pages/Newtab/Newtab.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Newtab/Newtab.scss)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Newtab/Newtab.scss 2:12-169 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Newtab/Newtab.jsx 15:0-23
 @ ./src/pages/Newtab/index.jsx 9:0-30 11:41-47

ERROR in ./src/pages/Newtab/Newtab.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Newtab/Newtab.scss)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Newtab/Newtab.scss 2:12-169 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Newtab/Newtab.jsx 15:0-23
 @ ./src/pages/Newtab/index.jsx 9:0-30 11:41-47

ERROR in ./src/pages/Newtab/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Newtab/index.css)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Newtab/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Newtab/index.jsx 10:0-21

ERROR in ./src/pages/Newtab/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Newtab/index.css)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Newtab/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Newtab/index.jsx 10:0-21

ERROR in ./src/pages/Options/Options.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Options/Options.css)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Options/Options.css 2:12-169 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Options/Options.tsx 2:0-23
 @ ./src/pages/Options/index.jsx 9:0-32 11:41-48

ERROR in ./src/pages/Options/Options.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Options/Options.css)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Options/Options.css 2:12-169 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Options/Options.tsx 2:0-23
 @ ./src/pages/Options/index.jsx 9:0-32 11:41-48

ERROR in ./src/pages/Options/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Options/index.css)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Options/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Options/index.jsx 10:0-21

ERROR in ./src/pages/Options/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Options/index.css)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Options/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Options/index.jsx 10:0-21

ERROR in ./src/pages/Panel/Panel.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Panel/Panel.css)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Panel/Panel.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Panel/Panel.tsx 2:0-21
 @ ./src/pages/Panel/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Panel/Panel.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Panel/Panel.css)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Panel/Panel.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Panel/Panel.tsx 2:0-21
 @ ./src/pages/Panel/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Panel/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Panel/index.css)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Panel/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Panel/index.jsx 10:0-21

ERROR in ./src/pages/Panel/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Panel/index.css)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Panel/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Panel/index.jsx 10:0-21

ERROR in ./src/pages/Popup/AppsDetails.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/AppsDetails.scss)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Popup/AppsDetails.scss 2:12-174 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/AppsDetails.js 13:0-28
 @ ./src/pages/Popup/Popup.js 23:0-40 183:136-147
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/AppsDetails.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/AppsDetails.scss)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Popup/AppsDetails.scss 2:12-174 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/AppsDetails.js 13:0-28
 @ ./src/pages/Popup/Popup.js 23:0-40 183:136-147
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/Popup.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/Popup.scss)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Popup/Popup.scss 2:12-168 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/Popup.js 21:0-22
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/Popup.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/Popup.scss)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Popup/Popup.scss 2:12-168 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/Popup.js 21:0-22
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/ProductRecommendations.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/ProductRecommendations.scss)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Popup/ProductRecommendations.scss 2:12-185 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/ProductRecommendations.js 13:0-39
 @ ./src/pages/Popup/Popup.js 24:0-62 193:39-61
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/ProductRecommendations.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/ProductRecommendations.scss)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Popup/ProductRecommendations.scss 2:12-185 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/ProductRecommendations.js 13:0-39
 @ ./src/pages/Popup/Popup.js 24:0-62 193:39-61
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/ScriptDetails.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/ScriptDetails.scss)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Popup/ScriptDetails.scss 2:12-176 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/ScriptsDetails.js 14:0-30
 @ ./src/pages/Popup/Popup.js 26:0-46 203:142-156
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/ScriptDetails.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/ScriptDetails.scss)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Popup/ScriptDetails.scss 2:12-176 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/ScriptsDetails.js 14:0-30
 @ ./src/pages/Popup/Popup.js 26:0-46 203:142-156
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/ThemeDetails.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/ThemeDetails.scss)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Popup/ThemeDetails.scss 2:12-175 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/ThemeDetails.js 13:0-29
 @ ./src/pages/Popup/Popup.js 22:0-42 172:40-52
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/ThemeDetails.scss (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/ThemeDetails.scss)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Popup/ThemeDetails.scss 2:12-175 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/ThemeDetails.js 13:0-29
 @ ./src/pages/Popup/Popup.js 22:0-42 172:40-52
 @ ./src/pages/Popup/index.jsx 9:0-28 11:41-46

ERROR in ./src/pages/Popup/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/index.css)
Module Error (from ./node_modules/sass-loader/dist/cjs.js):
Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (141)
For more information on which environments are supported please see:
https://github.com/sass/node-sass/releases/tag/v4.14.1
 @ ./src/pages/Popup/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/index.jsx 10:0-21

ERROR in ./src/pages/Popup/index.css (./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[0].use[2]!./src/pages/Popup/index.css)
Module build failed (from ./node_modules/css-loader/dist/cjs.js):
Error: PostCSS received undefined instead of CSS string
    at new Input (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\input.js:24:13)
    at parse (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\parse.js:8:15)
    at new LazyResult (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\lazy-result.js:122:16)
    at Processor.process (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\postcss\lib\processor.js:33:12)
    at Object.loader (D:\Web Dev\ChromeExtension\shopify-theme-wizard\node_modules\css-loader\dist\index.js:140:51)
 @ ./src/pages/Popup/index.css 2:12-167 9:17-24 13:7-21 45:20-34 49:6-59:7 50:38-52 56:26-40 58:21-28 68:15-29 47:4-60:5
 @ ./src/pages/Popup/index.jsx 10:0-21

13 errors have detailed information that is not shown.
Use 'stats.errorDetails: true' resp. '--stats-error-details' to show it.

webpack 5.23.0 compiled with 26 errors in 9188 ms
i ｢wdm｣: Failed to compile.