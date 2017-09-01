# See http://training.play-with-docker.com/node-zeit-pkg/

FROM node:slim

RUN npm install -g pkg pkg-fetch

ENV NODE latest
ENV PLATFORM linux
ENV ARCH x64

RUN /usr/local/bin/pkg-fetch ${NODE} ${PLATFORM} ${ARCH}

COPY . /app
WORKDIR /app
RUN npm install --silent && npm run build
RUN /usr/local/bin/pkg --target ${NODE}-${PLATFORM}-${ARCH} -o /app/runner ./dist/src/app.js

FROM debian:buster-slim

COPY --from=0 /app/runner /

CMD ["/bin/bash", "-c", "/runner"]