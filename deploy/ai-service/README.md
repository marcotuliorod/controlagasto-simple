# Runbook: mover `services/ai` da Vercel para a VPS Hostinger

Este runbook cobre as Fases A e B do plano de fechamento de pendências
(2026-09-17): provisionar a VPS e mover o `services/ai` para lá, substituindo
o projeto Vercel-container atual. Não mexe em Supabase nem no frontend.

Execute os comandos abaixo **na VPS**, via SSH — não deste repositório
localmente. Nenhum comando aqui precisa de acesso à VPS a partir do Claude
Code; é um runbook para você (ou para colar numa sessão de terminal comigo,
se preferir orientação passo a passo em vez de credenciais compartilhadas).

**Importante — infra que a Hostinger já provisiona na VPS:** a imagem já vem
com um Traefik rodando (`/docker/traefik`, fora deste repo, `network_mode:
host`, ocupando as portas 80/443) que roteia qualquer app do "Docker Compose
Catalog" da Hostinger por labels — é assim que um container de exemplo
(`openclaw`) já chega pela internet com TLS automático. Por isso a Fase B
usa **labels do Traefik**, não Caddy: um segundo processo tentando abrir
80/443 entraria em conflito de porta com esse Traefik já existente.

## Fase A — Provisionamento e hardening

```bash
# 1. Primeiro acesso como root
ssh root@SEU_IP_VPS
apt update && apt upgrade -y
```

**Cuidado com o `apt upgrade`**: se o pacote `openssh-server` for atualizado
e a imagem já tiver um `sshd_config` customizado (caso da Hostinger), o
`dpkg` pode parar num prompt interativo pedindo pra escolher entre a versão
do pacote e a local — sem TTY isso derruba a sessão SSH e trava com o
processo do apt ainda preso no lock, segurando `dpkg` até você entrar de novo
(console web da Hostinger, não SSH) e rodar `dpkg --configure -a` (mata o
processo travado antes, se precisar: `ps aux`, ache o `apt-get`/`dpkg`,
`kill <pid>`). Rodar o upgrade com `DEBIAN_FRONTEND=noninteractive` evita
isso; sem essa variável, prefira rodar pelo console web na primeira vez.

```bash
# 2. Usuário non-root com sudo
adduser --disabled-password --gecos '' deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# usuário sem senha ainda não consegue sudo (pede senha, não tem uma) —
# defina uma:
passwd deploy
```

Se ainda não tem chave SSH: gere na sua máquina (`ssh-keygen -t ed25519`) e
copie com `ssh-copy-id deploy@SEU_IP_VPS` antes do próximo passo.

**Antes de continuar**, abra uma segunda sessão de terminal e confirme que
`ssh deploy@SEU_IP_VPS` funciona **e** que `sudo` funciona com a senha
definida acima — só então prossiga (rede de segurança contra lockout, já que
o próximo passo desliga login de root/senha).

```bash
# 3. Endurecer SSH — um drop-in próprio, não editar sshd_config direto.
# Nome começando com número baixo importa: sshd usa "primeiro valor
# encontrado vence", e drop-ins são lidos em ordem alfabética antes do
# arquivo principal (a imagem da Hostinger já tem 50-cloud-init.conf e
# 60-cloudimg-settings.conf com valores conflitantes de PasswordAuthentication
# — um arquivo 10-*.conf garante que o seu vence os dois).
sudo tee /etc/ssh/sshd_config.d/10-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
EOF
sudo sshd -t   # valida a sintaxe antes de reiniciar
sudo systemctl restart ssh
```

Depois do restart, valide em conexões **novas** (não na sessão já aberta):
`ssh root@SEU_IP_VPS` deve falhar (`Permission denied`), `ssh
deploy@SEU_IP_VPS` deve continuar funcionando.

```bash
# 4. Firewall — só 22/80/443
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 5. fail2ban (jail padrão já cobre sshd, sem configuração extra)
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban

# 6. Docker
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sudo sh /tmp/get-docker.sh
sudo usermod -aG docker deploy
rm /tmp/get-docker.sh
exit
ssh deploy@SEU_IP_VPS   # reconectar para o grupo docker valer
docker ps               # sem sudo — se listar containers, o grupo pegou
docker compose version
```

**Nota sobre o `ufw` e containers já existentes:** regras de `-p`/publish de
porta do Docker escrevem direto no iptables/nftables e **contornam o ufw** —
uma porta publicada por qualquer container (inclusive os que a Hostinger já
tenha instalado) fica exposta ao mundo independente do que o `ufw` diz. Isso
não é um bug deste runbook, é como Docker e ufw interagem por padrão; vale
conferir `docker ps` e as portas publicadas de qualquer container já rodando
na VPS antes de assumir que só 22/80/443 estão acessíveis.

## Fase B — Deploy do `services/ai`

1. **DNS**: crie um registro `A` (`ai.seudominio.com` → IP da VPS) antes de
   seguir — o Traefik precisa disso resolvido para emitir o certificado TLS
   via Let's Encrypt (desafio HTTP-01, porta 80).

2. **Código na VPS**:
   ```bash
   mkdir -p /home/deploy/ai-service && cd /home/deploy/ai-service
   git clone --depth 1 https://github.com/<seu-usuario>/controlagasto-simple.git repo
   ```
   (Alternativa sem git na VPS: `scp -r services/ai deploy@SEU_IP_VPS:/home/deploy/ai-service/repo/services/ai` a partir da sua máquina.)

3. **Copiar `docker-compose.yml` deste diretório** para
   `/home/deploy/ai-service/` na VPS, e criar o `.env` a partir do
   `.env.example` (inclui `AI_DOMAIN`, usado tanto pela label do Traefik
   quanto injetado no container):
   ```bash
   scp deploy/ai-service/docker-compose.yml deploy@SEU_IP_VPS:/home/deploy/ai-service/
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

6. **Rollback**: o projeto Vercel foi desligado em 19/09/2026 e não é mais
   opção. Se a VPS falhar, suba o mesmo compose em outro host (passos 1–4 deste
   runbook, só com outro IP), aponte o DNS de `ai.mtrm.tech` para ele e, se o
   domínio mudar, refaça o `secrets set AI_SERVICE_URL=...` do passo 5. Guarde
   uma cópia do `.env` da VPS fora dela (senha/gerenciador), porque é o que
   falta para reimplantar.

## O que este runbook não faz
Não migra Supabase, não altera o frontend, não troca `AI_PROVIDER` (continua
Gemini), não modifica `services/ai/Dockerfile` — só muda onde o container
roda. Também não mexe no Traefik/`openclaw` já provisionados pela Hostinger
— só adiciona um novo serviço que o Traefik existente passa a descobrir.
