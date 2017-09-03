# See http://training.play-with-docker.com/node-zeit-pkg/

FROM node:latest AS build

RUN npm install -g pkg pkg-fetch
ENV NODE node8
ENV PLATFORM alpine
ENV ARCH x64
RUN /usr/local/bin/pkg-fetch ${NODE} ${PLATFORM} ${ARCH}

WORKDIR /app

COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . /app
RUN npm run build && pkg -t ${NODE}-${PLATFORM}-${ARCH} --output runner dist/src/app.js

FROM alpine:latest

WORKDIR /app
ENV NODE_ENV=production

RUN apk update && apk add --no-cache libstdc++ libgcc

COPY --from=build /app/runner /app/runner

CMD ["/app/runner"]
