FROM artifactory.dev.adskengineer.net/quantum-devops/cloudos-v2/base-nodejs8:latest AS build

WORKDIR /src
RUN adduser package-manager

RUN yum -y update && yum -y install make gcc gcc-c++
RUN npm i -g npm@latest

COPY . /src/
RUN make build

FROM artifactory.dev.adskengineer.net/quantum-devops/cloudos-v2/base-nodejs8:latest

USER greg
WORKDIR /srv
ENTRYPOINT [ "npm", "start" ]

COPY --from=build /etc/passwd /etc/group /etc/
COPY --from=build --chown=package-manager:package-manager /src/build /srv

ARG build_name
LABEL build_name=$build_name
ARG build_commit
LABEL build_commit=$build_commit
