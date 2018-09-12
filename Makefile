# This makefile is invoked by Dockerfile.
build:
	rm -rf build/
	mkdir -p build/
	cp -a package.json package-lock.json public src test build/
	cd build && npm ci
	# TODO: Deprecated. Remove this once .env is no longer used.
	cp .env build/
