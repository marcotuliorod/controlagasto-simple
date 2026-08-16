# Node 24 executa TypeScript nativamente (type stripping), então não há etapa
# de build: o que está em src/ roda direto. Isso mantém a imagem pequena e
# elimina a divergência entre o que é testado e o que vai para produção.
FROM node:24-alpine

WORKDIR /app

# Camada de dependências separada, para o cache não invalidar a cada mudança
# de código. --omit=dev deixa fora vitest, tsx e tipos, que não são usados em
# runtime.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

# Não roda como root.
USER node

# O serviço falha no boot se faltar variável obrigatória
# (SUPABASE_JWT_SECRET, GEMINI_API_KEY), então um container que sobe é um
# container configurado.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/http/server.ts"]
