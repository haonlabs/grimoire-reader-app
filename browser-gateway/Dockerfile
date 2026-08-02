FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npx playwright install --with-deps chromium
COPY server.mjs ./
COPY simulate-local.mjs ./

ENV PORT=8787 \
    USER_DATA_DIR=/data/chromium-profile \
    HEADLESS=true

VOLUME ["/data"]
EXPOSE 8787
CMD ["npm", "start"]
