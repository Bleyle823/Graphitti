CARGO_VERSION := $(shell cargo version 2>/dev/null)
START_BLOCK ?= 25900000
STOP_BLOCK ?= +5
MODULE ?= map_backing_mainnet
SUBGRAPH ?= kelp-rseth-unbacked-mints

.PHONY: build
build:
ifdef CARGO_VERSION
	cargo build --target wasm32-unknown-unknown --release
else
	@echo "Building substreams target using Docker. To speed up this step, install a Rust development environment."
	docker run --rm --init -v ${PWD}:/usr/src --workdir /usr/src/ rust:1.65.0 bash -lc "rustup target add wasm32-unknown-unknown && cargo build --target wasm32-unknown-unknown --release"
endif

.PHONY: run
run: build
	substreams run substreams.yaml $(MODULE) $(if $(START_BLOCK),-s $(START_BLOCK)) $(if $(STOP_BLOCK),-t $(STOP_BLOCK))

.PHONY: gui
gui: build
	substreams gui substreams.yaml $(MODULE) $(if $(START_BLOCK),-s $(START_BLOCK)) $(if $(STOP_BLOCK),-t $(STOP_BLOCK))

.PHONY: protogen
protogen:
	substreams protogen ./substreams.yaml --exclude-paths="sf/substreams,google"

.PHONY: pack
pack: build
	substreams pack substreams.yaml
	substreams pack substreams.arbitrum.yaml

.PHONY: deploy-subgraph
deploy-subgraph: pack
	graph codegen
	graph build
	graph deploy $(SUBGRAPH) --network mainnet
