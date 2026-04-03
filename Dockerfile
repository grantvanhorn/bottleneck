FROM node:20-alpine as build
WORKDIR /app
COPY package*.json .
RUN npm install --production

FROM alpine:3.18
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "index.js"]