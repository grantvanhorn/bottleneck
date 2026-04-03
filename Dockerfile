# Dockerfile for Bottleneck

# Stage 1: Build
FROM node:20-alpine as builder
WORKDIR /app
COPY package.json tsconfig.json .
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
RUN adduser -D bottleneck
RUN mkdir -p /data && chown bottleneck:bottleneck /data
USER bottleneck
CMD ["node", "dist/src/index.js"]