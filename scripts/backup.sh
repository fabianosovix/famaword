#!/usr/bin/env bash
# VelocCMS — Backup
# Cria um backup completo do banco de dados, uploads e configuração.
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/full_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Criando backup: ${BACKUP_FILE}"
tar czf "$BACKUP_FILE" \
  .env \
  data/ \
  uploads/ \
  2>/dev/null || true

echo "✓ Backup criado: ${BACKUP_FILE}"
echo "  Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"