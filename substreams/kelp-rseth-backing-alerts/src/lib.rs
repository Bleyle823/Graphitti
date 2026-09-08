mod pb {
    pub mod kelp {
        pub mod backing {
            pub mod v1 {
                include!(concat!(env!("OUT_DIR"), "/kelp.backing.v1.rs"));
            }
        }
    }
    pub mod sf {
        pub mod substreams {
            pub mod sink {
                pub mod entity {
                    pub mod v1 {
                        include!(concat!(env!("OUT_DIR"), "/sf.substreams.sink.entity.v1.rs"));
                    }
                }
            }
        }
    }
}

mod abi;

use pb::kelp::backing::v1::{ArbRsethSupply, BackingSnapshot, BackingSnapshots};
use pb::sf::substreams::sink::entity::v1::entity_change::Operation;
use pb::sf::substreams::sink::entity::v1::{EntityChange, EntityChanges, Field, Value};
use pb::sf::substreams::sink::entity::v1::value::Typed;
use std::str::FromStr;

use substreams::errors::Error;
use substreams::scalar::BigInt;
use substreams::store::{StoreGet, StoreGetProto};
use substreams_ethereum::pb::eth::v2::Block;
use substreams_ethereum::rpc::RpcBatch;

// Kelp contracts — matches Graphitti RPC workflow
const RSETH_MAINNET: &str = "a1290d69c65a6fe4df752f95823fae25cb99e5a7";
const LRT_DEPOSIT_POOL: &str = "036676389e48133b63a802f8635ad39e752d375d";
const STETH: &str = "ae7ab96520de3a18e5e111b5eaab095312d7fe84";
const ETHX: &str = "a35b1b31ce002fbf2058d22f30f95d405200a15b";
const NATIVE_ETH: &str = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const THRESHOLD_BPS: i32 = 50;
const STORE_KEY_ARB_SUPPLY: &str = "rseth_arb_supply";

fn val_string(value: impl Into<String>) -> Option<Value> {
    Some(Value {
        typed: Some(Typed::String(value.into())),
    })
}

fn val_bigint(value: impl Into<String>) -> Option<Value> {
    Some(Value {
        typed: Some(Typed::Bigint(value.into())),
    })
}

fn val_bigdecimal(value: impl Into<String>) -> Option<Value> {
    Some(Value {
        typed: Some(Typed::Bigdecimal(value.into())),
    })
}

fn val_bool(value: bool) -> Option<Value> {
    Some(Value {
        typed: Some(Typed::Bool(value)),
    })
}

fn val_int32(value: i32) -> Option<Value> {
    Some(Value {
        typed: Some(Typed::Int32(value)),
    })
}

fn address_hex(lower_hex: &str) -> String {
    format!("0x{}", lower_hex)
}

fn parse_bigint(raw: &str) -> BigInt {
    BigInt::from_str(raw).unwrap_or_else(|_| BigInt::zero())
}

fn wei_to_eth_fixed2(wei: &BigInt) -> String {
    let eth = wei.to_decimal(18);
    format!(
        "{:.2}",
        eth.to_string().parse::<f64>().unwrap_or(0.0)
    )
}

fn compute_snapshot(
    block_number: u64,
    mainnet_supply: BigInt,
    arb_supply: BigInt,
    steth: BigInt,
    ethx: BigInt,
    native_eth: BigInt,
) -> BackingSnapshot {
    let ethx_in_eth = (&ethx * BigInt::from(1066u64)) / BigInt::from(1000u64);
    let total_supply = &mainnet_supply + &arb_supply;
    let total_backing = &steth + &ethx_in_eth + &native_eth;
    let excess = if total_supply > total_backing {
        &total_supply - &total_backing
    } else {
        BigInt::zero()
    };

    let deviation_bps = if total_backing > BigInt::zero() {
        let bps = (&excess * BigInt::from(10_000u64)) / &total_backing;
        bps.to_string().parse::<i32>().unwrap_or(0)
    } else {
        0
    };

    let should_alert = deviation_bps > THRESHOLD_BPS;
    let deviation_pct = format!("{:.3}", deviation_bps as f64 / 100.0);

    BackingSnapshot {
        id: block_number.to_string(),
        block_number,
        deviation_bps,
        should_alert,
        mainnet_supply: mainnet_supply.to_string(),
        arb_supply: arb_supply.to_string(),
        total_supply: total_supply.to_string(),
        total_backing_eth: total_backing.to_string(),
        excess_eth: excess.to_string(),
        mainnet_supply_eth: wei_to_eth_fixed2(&mainnet_supply),
        arb_supply_eth: wei_to_eth_fixed2(&arb_supply),
        total_supply_eth: wei_to_eth_fixed2(&total_supply),
        total_backing_eth_human: wei_to_eth_fixed2(&total_backing),
        excess_eth_human: wei_to_eth_fixed2(&excess),
        deviation_pct,
        threshold_bps: THRESHOLD_BPS,
    }
}

fn fetch_mainnet_state(
    block_number: u64,
    block_hash: &[u8],
) -> Result<(BigInt, BigInt, BigInt, BigInt), Error> {
    let pool = address_hex(LRT_DEPOSIT_POOL);
    let batch = RpcBatch::new()
        .add(
            abi::erc20::functions::TotalSupply {},
            address_hex(RSETH_MAINNET),
        )
        .add(
            abi::lrt_deposit_pool::functions::GetTotalAssetDeposits {
                asset: hex::decode(STETH).unwrap(),
            },
            pool.clone(),
        )
        .add(
            abi::lrt_deposit_pool::functions::GetTotalAssetDeposits {
                asset: hex::decode(ETHX).unwrap(),
            },
            pool.clone(),
        )
        .add(
            abi::lrt_deposit_pool::functions::GetTotalAssetDeposits {
                asset: hex::decode(NATIVE_ETH).unwrap(),
            },
            pool,
        );

    let responses = batch.execute(block_number, Some(block_hash.to_vec()))?;

    let mainnet_supply = RpcBatch::decode::<_, abi::erc20::functions::TotalSupply>(
        &responses.responses[0],
    )?;
    let steth = RpcBatch::decode::<_, abi::lrt_deposit_pool::functions::GetTotalAssetDeposits>(
        &responses.responses[1],
    )?;
    let ethx = RpcBatch::decode::<_, abi::lrt_deposit_pool::functions::GetTotalAssetDeposits>(
        &responses.responses[2],
    )?;
    let native_eth = RpcBatch::decode::<_, abi::lrt_deposit_pool::functions::GetTotalAssetDeposits>(
        &responses.responses[3],
    )?;

    Ok((
        BigInt::from(mainnet_supply),
        BigInt::from(steth),
        BigInt::from(ethx),
        BigInt::from(native_eth),
    ))
}

#[substreams::handlers::map]
fn map_backing_snapshots(
    block: Block,
    arb_store: StoreGetProto<ArbRsethSupply>,
) -> Result<BackingSnapshots, Error> {
    let block_number = block.number;
    let block_hash = block.hash.clone();

    let (mainnet_supply, steth, ethx, native_eth) =
        fetch_mainnet_state(block_number, &block_hash)?;

    let arb_supply = arb_store
        .get_last(STORE_KEY_ARB_SUPPLY)
        .map(|entry| parse_bigint(&entry.supply))
        .unwrap_or_else(BigInt::zero);

    let snapshot = compute_snapshot(
        block_number,
        mainnet_supply,
        arb_supply,
        steth,
        ethx,
        native_eth,
    );

    Ok(BackingSnapshots {
        snapshots: vec![snapshot],
    })
}

#[substreams::handlers::map]
fn graph_out(snapshots: BackingSnapshots) -> Result<EntityChanges, Error> {
    let mut changes = EntityChanges::default();

    for snapshot in snapshots.snapshots {
        changes.entity_changes.push(EntityChange {
            entity: "BackingSnapshot".to_string(),
            id: snapshot.id.clone(),
            ordinal: snapshot.block_number,
            operation: Operation::Create as i32,
            fields: vec![
                Field {
                    name: "id".to_string(),
                    old_value: None,
                    new_value: val_string(snapshot.id),
                },
                Field {
                    name: "blockNumber".to_string(),
                    old_value: None,
                    new_value: val_bigint(snapshot.block_number.to_string()),
                },
                Field {
                    name: "mainnetSupply".to_string(),
                    old_value: None,
                    new_value: val_bigint(snapshot.mainnet_supply),
                },
                Field {
                    name: "arbSupply".to_string(),
                    old_value: None,
                    new_value: val_bigint(snapshot.arb_supply),
                },
                Field {
                    name: "totalSupply".to_string(),
                    old_value: None,
                    new_value: val_bigint(snapshot.total_supply),
                },
                Field {
                    name: "totalBackingEth".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.total_backing_eth),
                },
                Field {
                    name: "excessEth".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.excess_eth),
                },
                Field {
                    name: "deviationBps".to_string(),
                    old_value: None,
                    new_value: val_int32(snapshot.deviation_bps),
                },
                Field {
                    name: "deviationPct".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.deviation_pct),
                },
                Field {
                    name: "shouldAlert".to_string(),
                    old_value: None,
                    new_value: val_bool(snapshot.should_alert),
                },
                Field {
                    name: "thresholdBps".to_string(),
                    old_value: None,
                    new_value: val_int32(snapshot.threshold_bps),
                },
                Field {
                    name: "mainnetSupplyEth".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.mainnet_supply_eth),
                },
                Field {
                    name: "arbSupplyEth".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.arb_supply_eth),
                },
                Field {
                    name: "totalSupplyEth".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.total_supply_eth),
                },
                Field {
                    name: "totalBackingEthHuman".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.total_backing_eth_human),
                },
                Field {
                    name: "excessEthHuman".to_string(),
                    old_value: None,
                    new_value: val_bigdecimal(snapshot.excess_eth_human),
                },
            ],
        });
    }

    Ok(changes)
}
