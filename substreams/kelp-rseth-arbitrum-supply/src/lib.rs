mod pb {
    pub mod kelp {
        pub mod backing {
            pub mod v1 {
                include!(concat!(env!("OUT_DIR"), "/kelp.backing.v1.rs"));
            }
        }
    }
}

mod abi;

use pb::kelp::backing::v1::ArbRsethSupply;
use substreams::errors::Error;
use substreams::store::StoreSetProto;
use substreams_ethereum::pb::eth::v2::Block;
use substreams_ethereum::rpc::RpcBatch;

const RSETH_OFT_ARBITRUM: &str = "4186bfc76e2e237523cbc30fd220fe055156b41f";
const STORE_KEY: &str = "rseth_arb_supply";

#[substreams::handlers::map]
fn map_arb_rseth_supply(block: Block) -> Result<ArbRsethSupply, Error> {
    let batch = RpcBatch::new().add(
        abi::erc20::functions::TotalSupply {},
        format!("0x{}", RSETH_OFT_ARBITRUM),
    );

    let responses = batch.execute(block.number, Some(block.hash.clone()))?;
    let supply = RpcBatch::decode::<_, abi::erc20::functions::TotalSupply>(
        &responses.responses[0],
    )?;

    Ok(ArbRsethSupply {
        supply: supply.to_string(),
        block_number: block.number,
    })
}

#[substreams::handlers::store]
fn store_arb_rseth_supply(supply: ArbRsethSupply, store: StoreSetProto<ArbRsethSupply>) {
    store.set(0, STORE_KEY, &supply);
}
