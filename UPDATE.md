# VelocCMS — Guia de Atualização

## Atualização manual

A atualização é sempre iniciada pelo administrador. Nada acontece automaticamente.

### Verificar versão atual

```bash
node -e "console.log(require('./package.json').version)"
```

### Verificar versões disponíveis

Consulte as releases no GitHub: `https://github.com/SEU_USUARIO/veloccms/releases`

### Executar atualização

```bash
# Atualizar para a última release
./scripts/update.sh

# Atualizar para uma versão específica
./scripts/update.sh v1.1.0
```

O script de atualização:

1. **Faz backup** da instalação atual (código + .env + configurações) para `backups/`
2. **Baixa** a nova versão do GitHub
3. **Substitui** os arquivos do sistema (preserva `.env`, `data/`, `uploads/`, `backups/`)
4. **Reinstala** dependências
5. **Recompila** o frontend
6. **Executa** migrações de banco de dados
7. Exibe o resultado e instrui a reiniciar o servidor

### Reiniciar após atualização

```bash
# Se usar PM2:
pm2 restart veloccms

# Se rodar manualmente:
# Pare o processo (Ctrl+C) e inicie novamente:
node server/index.js
```

## O que é preservado

| Item | Preservado? |
|------|-----------|
| `.env` (configurações e segredos) | ✅ |
| `data/` (banco de dados SQLite) | ✅ |
| `uploads/` (imagens e mídia) | ✅ |
| `backups/` (backups anteriores) | ✅ |
| Código do sistema | ❌ Substituído |
| `node_modules/` | Reinstalado |
| `dist/` | Recompilado |

## Reverter uma atualização

Se algo der errado:

```bash
# Restaurar do backup
tar xzf backups/full_YYYYMMDD_HHMMSS.tar.gz

# Reinstalar dependências
npm install
cd server && npm install && cd ..

# Rebuild
npm run build

# Reiniciar
pm2 restart veloccms
```

## Backup manual

Execute antes de qualquer atualização ou manutenção:

```bash
./scripts/backup.sh
```

O backup inclui `.env`, banco de dados e uploads. Fica em `backups/`.