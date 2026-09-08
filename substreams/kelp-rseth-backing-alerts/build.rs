fn main() {
    substreams_ethereum::Abigen::new("Erc20", "abi/erc20.json")
        .expect("Failed to load ERC20 ABI")
        .generate()
        .expect("Failed to generate ERC20 bindings")
        .write_to_file("src/abi/erc20.rs")
        .expect("Failed to write ERC20 bindings");

    substreams_ethereum::Abigen::new("LrtDepositPool", "abi/lrt_deposit_pool.json")
        .expect("Failed to load deposit pool ABI")
        .generate()
        .expect("Failed to generate deposit pool bindings")
        .write_to_file("src/abi/lrt_deposit_pool.rs")
        .expect("Failed to write deposit pool bindings");

    prost_build::compile_protos(
        &[
            "proto/kelp_backing.proto",
            "proto/entity.proto",
        ],
        &["proto/"],
    )
    .expect("Failed to compile protos");
}
