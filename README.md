# VelocCMS

> CMS auto-hospedável, ultra-rápido e leve — focado em performance e monetização via AdSense.

[![Release](https://img.shields.io/badge/release-v1.0.0-blue)](https://github.com/fabianosovix/famaword/releases/tag/v1.0.0)
[![License](https://img.shields.io/badge/license-MIT-green)](#licença)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](#requisitos)

VelocCMS é um sistema de gerenciamento de conteúdo projetado para quem precisa de **velocidade máxima no site público** e **independência total do servidor**. Você instala no seu próprio VPS, com backend Node.js + SQLite, autenticação própria e zero dependência de plataformas terceiras.

## ✨ Recursos

- ⚡ **Site público otimizado para Core Web Vitals** — FCP/LCP baixos, skeleton estático, imagens responsivas em WebP 1200×675
- 🤖 **Geração de artigos por IA** (OpenAI) com agendamento semanal e fila de temas
- 🎨 **Painel administrativo limpo** — artigos, categorias, páginas, editores, usuários e configurações
- 🌍 **Multi-idioma** — pt-BR, es, en, fr, ar
- 📰 **Páginas estáticas** (sobre, contato, privacidade, cookies) com menu no rodapé
- 💰 **Pronto para AdSense** — `ads.txt` configurável, scripts de header/footer, navegação com recarga completa para rastreamento correto de anúncios
- 🔐 **Autenticação própria** — JWT + bcrypt, sem OTP, sem dependências externas
- 🗄️ **SQLite (WAL mode)** — sem servidor de banco separado, backup simples
- 🔄 **Atualização manual** via script que baixa releases do GitHub e preserva seus dados

## 📋 Requisitos

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| **Node.js** | 18.0 | 20+ LTS |
| **npm** | 9.0 | 10+ |
| **RAM** | 512 MB | 1 GB+ |
| **Disco** | 200 MB | 1 GB+ (mídia) |
| **SO** | Linux (Ubuntu/Debian) | Ubuntu 22.04+ |

> **Hosting compartilhado:** só funciona se o provedor permitir Node.js persistente (ex: SSH + PM2). PHP-only não é compatível.

## 🚀 Instalação rápida

```bash
git clone https://github.com/fabianosovix/famaword.git
cd famaword
bash installer/install.sh
```

O instalador interativo vai:
1. Verificar Node.js e npm
2. Instalar dependências
3. Criar `.env` com JWT secret seguro
4. Pedir a URL pública do site
5. Compilar o frontend
6. Configurar o banco SQLite
7. Pedir email e senha do administrador

Depois é só iniciar o servidor:

```bash
# Desenvolvimento
node server/index.js

# Produção (recomendado com PM2)
npm install -g pm2
pm2 start server/index.js --name famaword
pm2 save && pm2 startup
```

Acesse `https://seusite.com.br/admin` para entrar no painel.

📖 **Guia completo de instalação (com Nginx + SSL):** veja [`INSTALL.md`](INSTALL.md)

## 🔄 Atualização

```bash
bash scripts/update.sh           # última release
bash scripts/update.sh v1.1.0    # versão específica
```

O script faz backup automático antes de atualizar e **preserva** `.env`, `uploads/` e `data/`.

📖 **Detalhes:** veja [`UPDATE.md`](UPDATE.md)

## 📁 Estrutura

```
famaword/
├── server/              # Backend Node.js (Express + SQLite)
│   ├── routes/          # API REST (artigos, categorias, IA, mídia...)
│   ├── lib/             # Auth, CRUD genérico, upload, IA
│   ├── schema.sql       # Esquema do banco
│   └── index.js         # Entry point
├── src/                 # Frontend React (Vite)
│   ├── pages/           # Públicas + admin
│   ├── components/      # UI compartilhada
│   └── api/             # Cliente self-hosted
├── installer/           # Script de instalação
├── scripts/             # Update, backup, criar admin
├── public/              # Assets estáticos
├── INSTALL.md           # Guia de instalação
├── UPDATE.md            # Guia de atualização
└── REQUIREMENTS.md      # Requisitos detalhados
```

## 🗄️ Backup

```bash
bash scripts/backup.sh
# Gera backup em backups/veloccms-YYYY-MM-DD.tar.gz
```

## 🤖 Configurar IA (opcional)

Edite `.env` e adicione sua chave da OpenAI:
```
OPENAI_API_KEY=sk-sua-chave-aqui
```

Sem a chave, o CMS funciona normalmente para criação manual de artigos. A geração automática via IA fica indisponível.

## 🛡️ Segurança

- Senhas com hash bcrypt
- Autenticação via JWT com expiração
- Dados sensíveis (`.env`, `data/`, `uploads/`) gitignored
- Rotas administrativas protegidas por middleware

## 📄 Licença

MIT — livre para uso comercial e pessoal. Veja o arquivo de licença para detalhes.

## 🔗 Links

- **Releases:** https://github.com/fabianosovix/famaword/releases
- **Issues:** https://github.com/fabianosovix/famaword/issues
- **Documentação:** [`INSTALL.md`](INSTALL.md) · [`UPDATE.md`](UPDATE.md) · [`REQUIREMENTS.md`](REQUIREMENTS.md)