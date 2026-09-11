mod abi;
mod pb;
mod rpc;

use crate::pb::contract::v1::{ArbRsethSupply, BackingSnapshot, BackingSnapshots};
use crate::rpc::{fetch_arb_rseth_supply, KelpState};
use std::str::FromStr;
use substreams::errors::Error;
use substreams::scalar::BigInt;
use substreams::store::{StoreGet, StoreGetProto, StoreNew, StoreSet, StoreSetProto};
use substreams_entity_change::pb::entity::EntityChanges;
use substreams_entity_change::tables::Tables as EntityChangesTables;
use substreams_ethereum::pb::eth::v2 as eth;

const THRESHOLD_BPS: i32 = 50;
const STORE_KEY_ARB_SUPPLY: &str = "rseth_arb_supply";

substreams_ethereum::init!();

fn parse_bigint(raw: &str) -> BigInt {
    BigInt::from_str(raw).unwrap_or_else(|_| BigInt::zero())
}

fn block_timestamp(blk: &eth::Block) -> i64 {
    blk.header
        .as_ref()
        .and_then(|header| header.timestamp.as_ref())
        .map(|timestamp| timestamp.seconds)
        .unwrap_or(0)
}

fn saturating_sub(left: BigInt, right: BigInt) -> BigInt {
    if left > right {
        left - right
    } else {
        BigInt::zero()
    }
}

fn to_bps(excess: &BigInt, denominator: &BigInt) -> i32 {
    if denominator > &BigInt::zero() {
        let bps = (excess.clone() * BigInt::from(10_000u64)) / denominator.clone();
        bps.to_string().parse::<i32>().unwrap_or(0)
    } else if excess > &BigInt::zero() {
        10_000
    } else {
        0
    }
}

fn compute_snapshot(
    block_number: u64,
    timestamp: i64,
    mainnet_supply: BigInt,
    arb_supply: BigInt,
    adapter_balance: BigInt,
    steth: BigInt,
    ethx: BigInt,
    native_eth: BigInt,
) -> BackingSnapshot {
    // ETHx ~= 1.066 ETH (Stader non-rebasing LST)
    let ethx_in_eth = (ethx.clone() * BigInt::from(1066u64)) / BigInt::from(1000u64);
    let total_backing = steth.clone() + ethx_in_eth + native_eth.clone();

    // Circulating claim on the vault = unlocked mainnet rsETH + Arbitrum OFT.
    // Adapter-held rsETH is the lockbox for L2 mints, so subtracting it
    // is what makes an OFT escrow drain (Apr 2026) show up as extra supply.
    let unlocked_mainnet = saturating_sub(mainnet_supply.clone(), adapter_balance.clone());
    let effective_supply = unlocked_mainnet + arb_supply.clone();

    let excess = saturating_sub(effective_supply.clone(), total_backing.clone());
    let deviation_bps = to_bps(&excess, &total_backing);

    let bridge_excess = saturating_sub(arb_supply.clone(), adapter_balance.clone());
    let bridge_deviation_bps = to_bps(&bridge_excess, &adapter_balance);

    let should_alert = deviation_bps > THRESHOLD_BPS || bridge_deviation_bps > THRESHOLD_BPS;

    BackingSnapshot {
        id: block_number.to_string(),
        block_number,
        timestamp,
        mainnet_supply: mainnet_supply.to_string(),
        arb_supply: arb_supply.to_string(),
        total_supply: effective_supply.to_string(),
        steth_deposits: steth.to_string(),
        ethx_deposits: ethx.to_string(),
        native_eth_deposits: native_eth.to_string(),
        total_backing: total_backing.to_string(),
        excess: excess.to_string(),
        deviation_bps,
        should_alert,
        threshold_bps: THRESHOLD_BPS,
        adapter_balance: adapter_balance.to_string(),
        effective_supply: effective_supply.to_string(),
        bridge_excess: bridge_excess.to_string(),
        bridge_deviation_bps,
    }
}

#[substreams::handlers::map]
fn map_arb_rseth_supply(blk: eth::Block) -> Result<ArbRsethSupply, Error> {
    let supply = fetch_arb_rseth_supply()?;
    Ok(ArbRsethSupply {
        supply: supply.to_string(),
        block_number: blk.number,
    })
}

#[substreams::handlers::store]
fn store_arb_rseth_supply(supply: ArbRsethSupply, store: StoreSetProto<ArbRsethSupply>) {
    store.set(0, STORE_KEY_ARB_SUPPLY, &supply);
}

#[substreams::handlers::map]
fn map_backing_snapshots(
    blk: eth::Block,
    arb_store: StoreGetProto<ArbRsethSupply>,
) -> Result<BackingSnapshots, Error> {
    let state = KelpState::fetch()?;
    let arb_supply = arb_store
        .get_last(STORE_KEY_ARB_SUPPLY)
        .map(|entry| parse_bigint(&entry.supply))
        .unwrap_or_else(BigInt::zero);

    let snapshot = compute_snapshot(
        blk.number,
        block_timestamp(&blk),
        state.mainnet_supply,
        arb_supply,
        state.adapter_balance,
        state.steth,
        state.ethx,
        state.native_eth,
    );

    Ok(BackingSnapshots {
        snapshots: vec![snapshot],
    })
}

#[substreams::handlers::map]
fn map_backing_mainnet(blk: eth::Block) -> Result<BackingSnapshots, Error> {
    let state = KelpState::fetch()?;
    let snapshot = compute_snapshot(
        blk.number,
        block_timestamp(&blk),
        state.mainnet_supply,
        BigInt::zero(),
        state.adapter_balance,
        state.steth,
        state.ethx,
        state.native_eth,
    );

    Ok(BackingSnapshots {
        snapshots: vec![snapshot],
    })
}

fn entity_changes_from_snapshots(snapshots: BackingSnapshots) -> EntityChanges {
    let mut tables = EntityChangesTables::new();

    for snapshot in snapshots.snapshots {
        tables
            .create_row("BackingSnapshot", snapshot.id.as_str())
            .set("blockNumber", BigInt::from(snapshot.block_number))
            .set("timestamp", BigInt::from(snapshot.timestamp as u64))
            .set("mainnetSupply", parse_bigint(&snapshot.mainnet_supply))
            .set("arbSupply", parse_bigint(&snapshot.arb_supply))
            .set("totalSupply", parse_bigint(&snapshot.total_supply))
            .set("stethDeposits", parse_bigint(&snapshot.steth_deposits))
            .set("ethxDeposits", parse_bigint(&snapshot.ethx_deposits))
            .set("nativeEthDeposits", parse_bigint(&snapshot.native_eth_deposits))
            .set("totalBacking", parse_bigint(&snapshot.total_backing))
            .set("excess", parse_bigint(&snapshot.excess))
            .set("deviationBps", snapshot.deviation_bps)
            .set("shouldAlert", snapshot.should_alert)
            .set("thresholdBps", snapshot.threshold_bps)
            .set("adapterBalance", parse_bigint(&snapshot.adapter_balance))
            .set("effectiveSupply", parse_bigint(&snapshot.effective_supply))
            .set("bridgeExcess", parse_bigint(&snapshot.bridge_excess))
            .set("bridgeDeviationBps", snapshot.bridge_deviation_bps);
    }

    tables.to_entity_changes()
}

#[substreams::handlers::map]
fn graph_out(snapshots: BackingSnapshots) -> Result<EntityChanges, Error> {
    Ok(entity_changes_from_snapshots(snapshots))
}

#[substreams::handlers::map]
fn graph_out_subgraph(snapshots: BackingSnapshots) -> Result<EntityChanges, Error> {
    Ok(entity_changes_from_snapshots(snapshots))
}

#[substreams::handlers::map]
fn graph_out_arb(supply: ArbRsethSupply) -> Result<EntityChanges, Error> {
    let mut tables = EntityChangesTables::new();

    tables
        .create_row("ArbRsethSupply", supply.block_number.to_string())
        .set("blockNumber", BigInt::from(supply.block_number))
        .set("supply", parse_bigint(&supply.supply));

    Ok(tables.to_entity_changes())
}
