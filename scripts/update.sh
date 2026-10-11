#!/usr/bin/env bash
#
# VelocCMS — Atualização manual
# Baixa a versão mais recente do GitHub, faz backup, aplica atualização
# e executa migrações. NÃO sobrescreve .env, uploads/ ou data/.
#
# Uso: ./scripts/update.sh [versão]
#   Sem argumento: baixa a última release
#   Com versão:    baixa a versão específica (ex: v1.1.0)
#
set -e

BOLD="\033[1m"
GREEN="\033[32m"
RED="\033[31m"
YELLOW="\033[33m"
RESET="\033[0m"

REPO="${VEL_OCCMS_REPO:-user/veloccms}"  # Substitua pelo seu repo real
VERSION="${1:-latest}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BOLD}VelocCMS — Atualização${RESET}"
echo ""

# --- 1. Check current version ---
CURRENT=$(node -e "try{console.log(require('./package.json').version)}catch{console.log('unknown')}" 2>/dev/null || echo "unknown")
echo -e "Versão atual: ${YELLOW}${CURRENT}${RESET}"
echo -e "Versão alvo:  ${YELLOW}${VERSION}${RESET}"
echo ""

# --- 2. Determine download URL ---
if [ "$VERSION" == "latest" ]; then
  echo "Buscando última release..."
  RELEASE_URL=$(curl -sL "https://api.github.com/repos/${REPO}/releases/latest" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);console.log(j.tarball_url||'')}catch{console.log('')}
    })
  ")
  if [ -z "$RELEASE_URL" ]; then
    echo -e "${RED}✗ Não foi possível obter a última release. Verifique o repositório: ${REPO}${RESET}"
    exit 1
  fi
else
  RELEASE_URL="https://api.github.com/repos/${REPO}/tarball/${VERSION}"
fi

# --- 3. Backup ---
echo -e "${BOLD}[1/4] Backup...${RESET}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
tar czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='data' \
  --exclude='uploads' \
  --exclude='backups' \
  --exclude='.git' \
  . 2>/dev/null || true
echo -e "${GREEN}✓ Backup: ${BACKUP_FILE}${RESET}"
echo ""

# --- 4. Download ---
echo -e "${BOLD}[2/4] Baixando ${VERSION}...${RESET}"
TEMP_DIR=$(mktemp -d)
curl -sL "$RELEASE_URL" | tar xz -C "$TEMP_DIR"
SRC_DIR=$(ls -d "$TEMP_DIR"/*/ | head -1)
if [ -z "$SRC_DIR" ]; then
  echo -e "${RED}✗ Falha ao baixar/extrair${RESET}"
  rm -rf "$TEMP_DIR"
  exit 1
fi
echo -e "${GREEN}✓ Download concluído${RESET}"
echo ""

# --- 5. Apply update (preserve user data) ---
echo -e "${BOLD}[3/4] Aplicando atualização...${RESET}"
# Copy new source files, but preserve .env, data/, uploads/, back
rsync -av --exclude='.env' --exclude='data' --exclude='uploads' --exclude='backups' --exclude='node_modules' --exclude='dist' "$SRC_DIR" . 2>/dev/null || \
  cp -r "$SRC_DIR"* . 2>/dev/null || true
rm -rf "$TEMP_DIR"

# Reinstall dependencies
echo "Reinstalando dependências..."
npm install --production=false 2>&1 | tail -3
cd server && npm install --production 2>&1 | tail -3 && cd ..

# Rebuild frontend
echo "Recompilando frontend..."
if [ -f vite.selfhosted.config.js ]; then
  npx vite build --config vite.selfhosted.config.js 2>&1 | tail -3
else
  npm run build 2>&1 | tail -3
fi
echo ""

# --- 6. Migrations ---
echo -e "${BOLD}[4/4] Migrações de banco...${RESET}"
cd server && node migrate.js && cd ..
echo ""

# --- Done ---
echo -e "${GREEN}${BOLD}✓ Atualização concluída!${RESET}"
echo ""
echo "Reinicie o servidor:"
echo -e "  ${GREEN}pm2 restart veloccms${RESET}  (se usando PM2)"
echo -e "  ${GREEN}node server/index.js${RESET}   (manual)"
echo ""
echo -e "Backup anterior em: ${BACKUP_FILE}"
echo "Para reverter, restaure o backup e reinicie."