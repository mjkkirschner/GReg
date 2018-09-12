DOCKER_ORG ?= dynamo
DOCKER_TAG ?= local

# This makefile is invoked by Dockerfile. You probably don't want to
# invoke it manually. Use "docker-compose up" instead.
build:
	rm -rf build/
	mkdir -p build/
	cp -a package.json package-lock.json public src test build/
	cd build && npm ci
	# TODO: Deprecated. Remove this once .env is no longer used.
	cp .env build/

docker_build:
	docker build -t ${DOCKER_ORG}/package-manager:${DOCKER_TAG} .

docker_push:
	docker push ${DOCKER_ORG}/package-manager:${DOCKER_TAG}

docker_clean:
	docker rmi -f ${DOCKER_ORG}/package-manager:${DOCKER_TAG} || true
