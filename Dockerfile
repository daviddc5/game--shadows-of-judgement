# Stage 1: Build the client
FROM node:20-alpine AS build

WORKDIR /app

# Copy root package files and install client deps
COPY package.json package-lock.json* ./
RUN npm ci

# Copy client source and build
COPY index.html ./
COPY vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine

WORKDIR /app/server

# Copy server package files and install production deps only
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# Copy server source
COPY server/*.js ./

# The server runs the same rules engine as the client (imported as ../src/case)
COPY src/case/package.json src/case/cards.js src/case/rules.js /app/src/case/

# Copy built client from Stage 1
COPY --from=build /app/dist ./dist

# Cloud Run sets PORT env variable
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
