# VelocCMS — Requisitos do Servidor

## Sistema operacional

- **Linux** (Ubuntu 20.04+, Debian 11+, CentOS 8+) — recomendado
- **macOS** — desenvolvimento
- **Windows** — não recomendado para produção (use WSL2)

## Software

| Software | Versão mínima | Notas |
|----------|--------------|-------|
| Node.js | 18.0 | 20+ LTS recomendado |
| npm | 9.0 | Vem com Node.js |
| Nginx | 1.18 | Proxy reverso + SSL |
| Certbot | qualquer | SSL gratuito (Let's Encrypt) |
| PM2 | 5.0 | Gerenciador de processos (recomendado) |

## Banco de dados

- **SQLite** — incluído, zero configuração
- Arquivo único em `data/veloccms.db`
- WAL mode habilitado para leituras concorrentes
- Backup: copie o arquivo `data/veloccms.db` (ou use `scripts/backup.sh`)

## Portas

| Porta | Uso |
|-------|-----|
| 3000 | Servidor Node.js (configurável via `PORT` no `.env`) |
| 80 | Nginx (HTTP) |
| 443 | Nginx (HTTPS) |

## Permissões

```bash
# O usuário que roda o Node.js precisa de:
# - Leitura/escrita em: data/, uploads/, .env
# - Leitura em: dist/, server/
chown -R www-data:www-data data uploads .env
chmod 600 .env
```

## Limitações

- **Hosting compartilhado PHP-only:** não compatível (ex: cPanel sem Node.js)
- **Sem Node.js persistente:** não compatível (o servidor precisa rodar continuamente)
- **Tráfego muito alto:** SQLite suporta bem até ~1000 acessos simultâneos em leitura; para mais, considere migrar para PostgreSQL
- **SSL:** necessário Nginx + Certbot (o servidor Node.js não termina SSL diretamente)

## Provedores compatíveis (VPS)

- DigitalOcean (Droplet $4/mês)
- Hetzner Cloud (CX11 €4/mês)
- Vultr ($6/mês)
- AWS Lightsail ($5/mês)
- Linode/Akamai ($5/mês)

Qualquer VPS com Ubuntu 22.04+ e acesso root/SSH funciona.