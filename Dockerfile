FROM artifactory.dev.adskengineer.net/quantum-devops/cloudos-v2/base-nodejs8:latest AS build

WORKDIR /src

RUN yum -y update && yum -y install make gcc gcc-c++
RUN npm i -g npm@latest

COPY . /src/
RUN make build

FROM artifactory.dev.adskengineer.net/quantum-devops/cloudos-v2/base-nodejs8:latest

WORKDIR /srv
CMD [ "npm", "start" ]

COPY --from=build /src/build /srv

ARG build_name
LABEL build_name=$build_name
ARG build_commit
LABEL build_commit=$build_commit
