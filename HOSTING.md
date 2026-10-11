# Configuração de Hospedagem — VelocCMS

O site público usa navegação com recarga completa de documento (links nativos `<a href>`).
Cada clique em um artigo, categoria ou página institucional carrega um novo documento HTML.

Para que rotas profundas (ex: `/artigo/meu-artigo`, `/categoria/tecnologia`, `/pagina/sobre`)
funcionem ao acessar diretamente ou atualizar a página, o servidor deve servir o
`index.html` do app para todas as rotas que não sejam arquivos estáticos.

## Static hosts (Netlify, Cloudflare Pages)

O arquivo `public/_redirects` já está incluído no build:

```
/*    /index.html   200
```

Nenhuma configuração adicional é necessária.

## Vercel

O arquivo `vercel.json` já está incluído na raiz do projeto.

## Nginx

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    root /var/www/veloccms/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Apache (.htaccess no diretório do build)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## Express / Node.js

```js
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(3000);
```

## Build

```bash
npm install
npm run build
```

Os arquivos estáticos ficam em `dist/`.