# VelocCMS — Guia de Instalação

## Requisitos do servidor

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| **Node.js** | 18.0 | 20+ LTS |
| **npm** | 9.0 | 10+ |
| **RAM** | 512 MB | 1 GB+ |
| **Disco** | 200 MB | 1 GB+ (mídia) |
| **SO** | Linux (Ubuntu/Debian) | Ubuntu 22.04+ |

> **Hosting compartilhado:** só funciona se o provedor permitir Node.js persistente (ex: SSH + PM2). PHP-only não é compatível.

## Instalação

### 1. Obter o código

```bash
# Via Git
git clone https://github.com/SEU_USUARIO/veloccms.git
cd veloccms

# Ou via download da release
wget https://github.com/SEU_USUARIO/veloccms/archive/refs/tags/v1.0.0.tar.gz
tar xzf v1.0.0.tar.gz
cd veloccms-1.0.0
```

### 2. Executar o instalador

```bash
chmod +x installer/install.sh
./installer/install.sh
```

O instalador vai:
1. Verificar Node.js e npm
2. Instalar dependências
3. Criar `.env` com JWT secret seguro
4. Pedir a URL pública do site
5. Compilar o frontend
6. Configurar o banco SQLite
7. Pedir email e senha do administrador

### 3. Iniciar o servidor

```bash
# Desenvolvimento / teste
node server/index.js

# Produção (recomendado com PM2)
npm install -g pm2
pm2 start server/index.js --name veloccms
pm2 save
pm2 startup
```

### 4. Configurar Nginx (proxy reverso)

```nginx
server {
    listen 80;
    server_name seusite.com.br;
    root /var/www/veloccms/dist;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Depois habilite SSL com Certbot:
```bash
sudo certbot --nginx -d seusite.com.br
```

### 5. Configurar IA (opcional)

Edite `.env` e adicione sua chave da OpenAI:
```
OPENAI_API_KEY=sk-sua-chave-aqui
```

Sem a chave, o CMS funciona normalmente para criação manual de artigos. A geração automática via IA fica indisponível.

## Migração de dados existentes

Se você já tem conteúdo na versão Base44 do VelocCMS:

1. Exporte as entidades como CSV (via painel Base44 → Entities → Export)
2. Use o script de importação:
```bash
node server/scripts/import-csv.js articles articles.csv
node server/scripts/import-csv.js categories categories.csv
```

## Próximos passos

- Acesse `https://seusite.com.br/admin` para o painel administrativo
- Configure categorias, editores e páginas institucionais
- Configure o `ads.txt` nas configurações para monetização
- **Sitemap e robots.txt são gerados automaticamente** em `/sitemap.xml` e `/robots.txt` — cadastre `https://seusite.com.br/sitemap.xml` no [Google Search Console](https://search.google.com/search-console) para indexação automática de novos artigos
- Veja `UPDATE.md` para instruções de atualização