FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true

COPY index.js ./index.js
COPY src ./src
COPY assets ./assets

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
