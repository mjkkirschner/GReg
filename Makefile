# This makefile is invoked by Dockerfile.
build:
	rm -rf build/
	cp -a package.json package-lock.json public src test build/
	cd build && npm ci
	# TODO: Secrets should not be baked into the image!
	# This needs to use Vault/SSM.
	COPY .env build/
