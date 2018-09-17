# This makefile is invoked by Dockerfile. You probably don't want to
# invoke these rules manually. Use "docker-compose up" for local testing
# instead.

DOCKER_ORG ?= dynamo
DOCKER_TAG ?= local

BUILD_NAME ?= local
BUILD_COMMIT ?= local
DOCKER_ARGS := --build-arg build_name=${BUILD_NAME} --build-arg build_commit=${BUILD_COMMIT}

# TODO: Remove '--exit' in package.json once we've debugged why mocha doesn't exit automatically.
#   See https://boneskull.com/mocha-v4-nears-release/#mochawontforceexit for some more
#   information.
TEST_CMD := npm run test

build:
	rm -rf build/
	mkdir -p build/
	cp -a package.json package-lock.json public src test build/
	cd build && npm ci
	# TODO: Deprecated. Remove this once .env is no longer used.
	cp .env build/ || true

docker_test:
	docker-compose build
	docker-compose up -d mongo
	sleep 5
	docker-compose run greg ${TEST_CMD}
	docker-compose down

docker_build:
	docker build ${DOCKER_ARGS} -t ${DOCKER_ORG}/dynamopm:${DOCKER_TAG} .

docker_push:
	docker push ${DOCKER_ORG}/dynamopm:${DOCKER_TAG}

docker_clean:
	docker rmi -f ${DOCKER_ORG}/dynamopm:${DOCKER_TAG} || true
