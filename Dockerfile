# ビルドステージ
FROM node:lts-bullseye
WORKDIR /app

RUN apt-get -y update\
    && apt-get -y upgrade\
    && apt-get install -y ffmpeg

COPY . ./
RUN npm install

CMD ["npm", "run", "deploy"]
