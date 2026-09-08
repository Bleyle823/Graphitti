fn main() {
    substreams_ethereum::Abigen::new("Erc20", "abi/erc20.json")
        .expect("Failed to load ERC20 ABI")
        .generate()
        .expect("Failed to generate ERC20 bindings")
        .write_to_file("src/abi/erc20.rs")
        .expect("Failed to write ERC20 bindings");

    prost_build::compile_protos(&["../kelp-rseth-backing-alerts/proto/kelp_backing.proto"], &[
        "../kelp-rseth-backing-alerts/proto/",
    ])
    .expect("Failed to compile protos");
}
