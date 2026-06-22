FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev
COPY server.js .
COPY mcp-server.js .
COPY src/utils/dataLoader.js ./src/utils/dataLoader.js
COPY src/utils/entity.js ./src/utils/entity.js
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "server.js"]
