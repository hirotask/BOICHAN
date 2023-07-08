# ビルドステージ
FROM node:lts-bullseye
WORKDIR /app

COPY package*.json ./
RUN npm install
