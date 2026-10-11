#!/usr/bin/env bash
#
# VelocCMS — Instalador tradicional
# Requisitos: Node.js 18+, npm
#
set -e

BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
RESET="\033[0m"

echo -e "${BOLD}╔══════════════════════════════════════╗"
echo -e "║     VelocCMS — Instalador v1.0      ║"
echo -e "╚══════════════════════════════════════╝${RESET}"
echo ""

# --- 1. Check prerequisites ---
echo -e "${BOLD}[1/7] Verificando pré-requisitos...${RESET}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js não encontrado.${RESET}"
  echo "  Instale Node.js 18+ em: https://nodejs.org/"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}✗ Node.js 18+ necessário. Atual: $(node -v)${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${RESET}"

if ! command -v npm &> /dev/null; then
  echo -e "${RED}✗ npm não encontrado.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${RESET}"
echo ""

# --- 2. Install dependencies ---
echo -e "${BOLD}[2/7] Instalando dependências do frontend...${RESET}"
npm install --production=false 2>&1 | tail -3

echo -e "${BOLD}Instalando dependências do servidor...${RESET}"
cd server && npm install --production 2>&1 | tail -3 && cd ..
echo ""

# --- 3. Create .env ---
echo -e "${BOLD}[3/7] Configurando ambiente...${RESET}"
if [ ! -f .env ]; then
  cp .env.example .env

  # Generate secure JWT secret
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  # Use sed portable way (BSD + GNU)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|CHANGE_ME_JWT_SECRET|$JWT_SECRET|g" .env
  else
    sed -i "s|CHANGE_ME_JWT_SECRET|$JWT_SECRET|g" .env
  fi

  # Ask for public URL
  echo "  Digite a URL pública do site (ex: https://seusite.com.br):"
  read -r PUBLIC_URL
  if [ -n "$PUBLIC_URL" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|http://localhost:3000|$PUBLIC_URL|g" .env
    else
      sed -i "s|http://localhost:3000|$PUBLIC_URL|g" .env
    fi
  fi

  echo -e "${GREEN}✓ .env criado${RESET}"
else
  echo -e "${YELLOW}⚠ .env já existe — pulando${RESET}"
fi
echo ""

# --- 4. Build frontend ---
echo -e "${BOLD}[4/7] Compilando frontend...${RESET}"
if [ -f vite.selfhosted.config.js ]; then
  npx vite build --config vite.selfhosted.config.js 2>&1 | tail -5
else
  npm run build 2>&1 | tail -5
fi
echo ""

# --- 5. Database setup ---
echo -e "${BOLD}[5/7] Configurando banco de dados...${RESET}"
cd server && node migrate.js && cd ..
echo ""

# --- 6. Create admin account ---
echo -e "${BOLD}[6/7] Criando conta de administrador...${RESET}"
echo ""
echo "  Email do administrador:"
read -r ADMIN_EMAIL
echo "  Senha (mínimo 6 caracteres):"
read -s ADMIN_PASSWORD
echo ""
cd server && node scripts/create-admin.js "$ADMIN_EMAIL" "$ADMIN_PASSWORD" && cd ..
echo ""

# --- 7. Done ---
echo -e "${BOLD}[7/7] Instalação concluída!${RESET}"
echo ""
echo -e "  Para iniciar o servidor:"
echo -e "  ${GREEN}node server/index.js${RESET}"
echo ""
echo -e "  Para manter rodando em produção (recomendado):"
echo -e "  ${GREEN}npm install -g pm2${RESET}"
echo -e "  ${GREEN}pm2 start server/index.js --name veloccms${RESET}"
echo -e "  ${GREEN}pm2 save && pm2 startup${RESET}"
echo ""
echo -e "  Configura o Nginx como proxy reverso para a porta 3000."
echo -e "  Veja ${BOLD}INSTALL.md${RESET} para instruções completas."
echo ""