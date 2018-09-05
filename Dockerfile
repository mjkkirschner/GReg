FROM artifactory.dev.adskengineer.net/quantum-devops/cloudos-v2/base-nodejs8:latest

RUN yum -y update && yum clean all
RUN npm i -g npm@latest

WORKDIR /srv

COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm ci 

COPY .env .env

COPY public public
COPY src src
COPY test test

ENTRYPOINT [ "npm", "start" ]

ARG build_name
LABEL build_name=$build_name
ARG build_commit
LABEL build_commit=$build_commit