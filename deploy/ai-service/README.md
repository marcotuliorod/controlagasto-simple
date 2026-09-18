# Runbook: mover `services/ai` da Vercel para a VPS Hostinger

Este runbook cobre as Fases A e B do plano de fechamento de pendências
(2026-09-17): provisionar a VPS e mover o `services/ai` para lá, substituindo
o projeto Vercel-container atual. Não mexe em Supabase nem no frontend.

Execute os comandos abaixo **na VPS**, via SSH — não deste repositório
localmente. Nenhum comando aqui precisa de acesso à VPS a partir do Claude
Code; é um runbook para você (ou para colar numa sessão de terminal comigo,
se preferir orientação passo a passo em vez de credenciais compartilhadas).

## Fase A — Provisionamento e hardening

```bash
# 1. Primeiro acesso como root
ssh root@SEU_IP_VPS
apt update && apt upgrade -y

# 2. Usuário non-root com sudo
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

Se ainda não tem chave SSH: gere na sua máquina (`ssh-keygen -t ed25519`) e
copie com `ssh-copy-id deploy@SEU_IP_VPS` antes do próximo passo.

**Antes de continuar**, abra uma segunda sessão de terminal e confirme que
`ssh deploy@SEU_IP_VPS` funciona — só então prossiga (rede de segurança
contra lockout, já que o próximo passo desliga login de root/senha).

```bash
# 3. Endurecer SSH
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# 4. Firewall — só 22/80/443
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 5. fail2ban (jail padrão já cobre sshd, sem configuração extra)
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban

# 6. Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy
exit
ssh deploy@SEU_IP_VPS   # reconectar para o grupo docker valer
docker run hello-world
docker compose version
```

## Fase B — Deploy do `services/ai`

1. **DNS**: crie um registro `A` (`ai.seudominio.com` → IP da VPS) antes de
   seguir — o Caddy precisa disso resolvido para emitir o certificado TLS.

2. **Código na VPS**:
   ```bash
   mkdir -p /home/deploy/ai-service && cd /home/deploy/ai-service
   git clone --depth 1 https://github.com/<seu-usuario>/controlagasto-simple.git repo
   ```
   (Alternativa sem git na VPS: `scp -r services/ai deploy@SEU_IP_VPS:/home/deploy/ai-service/repo/services/ai` a partir da sua máquina.)

3. **Copiar os arquivos deste diretório** (`docker-compose.yml`, `Caddyfile`)
   para `/home/deploy/ai-service/` na VPS, e o `.env` preenchido a partir de
   `.env.example`:
   ```bash
   scp deploy/ai-service/docker-compose.yml deploy/ai-service/Caddyfile deploy@SEU_IP_VPS:/home/deploy/ai-service/
   # editar Caddyfile na VPS trocando SEU-DOMINIO.com pelo domínio real
   # criar .env na VPS a partir do .env.example, com os valores reais
   ssh deploy@SEU_IP_VPS 'chmod 600 /home/deploy/ai-service/.env'
   ```

4. **Subir**:
   ```bash
   cd /home/deploy/ai-service
   docker compose up -d --build
   docker compose ps                                              # container "healthy"?
   docker inspect --format='{{.State.Health.Status}}' ai-service-ai-1
   curl -sS https://ai.seudominio.com/health
   ```

5. **Corte** (a partir da sua máquina local, com Supabase CLI logado):
   ```bash
   npx supabase secrets set AI_SERVICE_URL=https://ai.seudominio.com
   ```
   Efeito imediato, sem redeploy de edge function. Validar no app real:
   - `chat-assistant`: pergunta simples no assistente financeiro.
   - `generate-insights`: gerar insights do mês.
   - `process-import-file`: importar um arquivo que force o fallback de IA
     (formato não reconhecido pela regra determinística).

   Acompanhar em paralelo:
   ```bash
   npx supabase functions logs chat-assistant --project-ref <ref>
   ssh deploy@SEU_IP_VPS 'cd ai-service && docker compose logs -f ai'
   ```

6. **Rollback**: manter o projeto Vercel no ar. Se algo falhar, reverta o
   secret para a URL antiga da Vercel — mesmo comando `secrets set`, efeito
   imediato.

## O que este runbook não faz
Não migra Supabase, não altera o frontend, não troca `AI_PROVIDER` (continua
Gemini), não modifica `services/ai/Dockerfile` — só muda onde o container
roda.
