FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Dependências em produção
COPY package*.json ./
RUN npm ci --omit=dev

# Código
COPY . .

# Saúde (usa curl)
RUN apk add --no-cache curl
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD curl -fsS http://localhost:3000/healthz || exit 1

EXPOSE 3000
# Se seu start em prod for outro, ajuste aqui:
CMD ["node","server-production.js"]
