14 works fine, 13 doesn't

![image](https://user-images.githubusercontent.com/4065733/187495723-709d2458-10e5-4f11-833b-e801ed9deca6.png)

13 works fine, 12 doesn't
![image](https://user-images.githubusercontent.com/4065733/187495805-3bd47575-2514-4141-b61e-c8d2424aec74.png)

10 works fine, 9 doesn't

![image](https://user-images.githubusercontent.com/4065733/187495962-c8f54cdf-4bf4-4aa9-9dfb-0c0c998d4d53.png)

Code here: 

https://gist.github.com/eduardoarandah/819d75ac81cd6bd00b2c995b690ea687

LspInfo:

```
 
 Language client log: /Users/lalo/.cache/nvim/lsp.log
 Detected filetype:   vue
 
 3 client(s) attached to this buffer: 
 
 Client: volar (id: 11, pid: 97230, bufnr: [128, 20, 150, 125, 8])
 	filetypes:       vue
 	autostart:       true
 	root directory:  /Users/lalo/repos/palos
 	cmd:             vue-language-server --stdio
 
 Client: tailwindcss (id: 9, pid: 97225, bufnr: [155, 20, 150, 8, 125, 128])
 	filetypes:       aspnetcorerazor, astro, astro-markdown, blade, django-html, htmldjango, edge, eelixir, ejs, erb, eruby, gohtml, haml, handlebars, hbs, html, html-eex, heex, jade, leaf, liquid, markdown, mdx, mustache, njk, nunjucks, php, razor, slim, twig, css, less, postcss, sass, scss, stylus, sugarss, javascript, javascriptreact, reason, rescript, typescript, typescriptreact, vue, svelte
 	autostart:       true
 	root directory:  /Users/lalo/repos/palos
 	cmd:             tailwindcss-language-server --stdio
 
 Client: eslint (id: 12, pid: 97264, bufnr: [125])
 	filetypes:       javascript, javascriptreact, javascript.jsx, typescript, typescriptreact, typescript.tsx, vue
 	autostart:       true
 	root directory:  /Users/lalo/repos/palos
 	cmd:             vscode-eslint-language-server --stdio
 
 1 active client(s) not attached to this buffer: 
 
 Client: tsserver (id: 10, pid: 97229, bufnr: [155])
 	filetypes:       javascript, javascriptreact, javascript.jsx, typescript, typescriptreact, typescript.tsx
 	autostart:       true
 	root directory:  /Users/lalo/repos/palos
 	cmd:             typescript-language-server --stdio
 
 Configured servers list: eslint, html, jsonls, tailwindcss, tsserver, vimls, volar, yamlls, bashls, sumneko_lua, intelephense, cssls

```

Install

NVIM v0.7.2
neovim/nvim-lspconfig df17834 (updated today) 
lsp: volar (vue)
      version     0.40.4                                 
      installed   30 Aug 2022 12:02                      

