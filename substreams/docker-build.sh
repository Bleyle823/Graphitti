#!/bin/sh
set -e
restore_toolchain() {
  if [ -f rust-toolchain.toml.dockerbak ]; then
    mv rust-toolchain.toml.dockerbak rust-toolchain.toml
  fi
}
trap restore_toolchain EXIT
if [ -f rust-toolchain.toml ]; then
  mv rust-toolchain.toml rust-toolchain.toml.dockerbak
fi
export CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse
rustup target add wasm32-unknown-unknown
mkdir -p /usr/src/target/wasm32-unknown-unknown/release
export CARGO_TARGET_DIR=/tmp/target
cargo build --target wasm32-unknown-unknown --release
cp /tmp/target/wasm32-unknown-unknown/release/substreams.wasm /usr/src/target/wasm32-unknown-unknown/release/substreams.wasm
ls -lh /usr/src/target/wasm32-unknown-unknown/release/substreams.wasm

