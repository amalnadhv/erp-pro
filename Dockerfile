# Build the UI, then run the tiny Node server that also serves the API.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173
# Mount a volume here to keep data/erp.db across restarts/deploys.
ENV ERP_DATA_DIR=/data
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4173)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/start.mjs"]
