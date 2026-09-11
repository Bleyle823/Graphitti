use crate::abi::contract::functions::{BalanceOf, GetTotalAssetDeposits, TotalSupply};
use hex_literal::hex;
use substreams::errors::Error;
use substreams::scalar::BigInt;
use substreams_ethereum::rpc::RpcBatch;

pub const RSETH_MAINNET: [u8; 20] = hex!("a1290d69c65a6fe4df752f95823fae25cb99e5a7");
pub const RSETH_OFT_ARBITRUM: [u8; 20] = hex!("4186bfc76e2e237523cbc30fd220fe055156b41f");
pub const LRT_DEPOSIT_POOL: [u8; 20] = hex!("036676389e48133b63a802f8635ad39e752d375d");
pub const STETH: [u8; 20] = hex!("ae7ab96520de3a18e5e111b5eaab095312d7fe84");
pub const ETHX: [u8; 20] = hex!("a35b1b31ce002fbf2058d22f30f95d405200a15b");
pub const NATIVE_ETH: [u8; 20] = hex!("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
/// LayerZero OFT adapter / lockbox that held rsETH for L2 mints.
/// The Apr 2026 exploit released 116,500 rsETH from this contract without an L2 burn.
pub const RSETH_OFT_ADAPTER: [u8; 20] = hex!("85d456b2dff1fd8245387c0bfb64dfb700e98ef3");

pub struct KelpState {
    pub mainnet_supply: BigInt,
    pub adapter_balance: BigInt,
    pub steth: BigInt,
    pub ethx: BigInt,
    pub native_eth: BigInt,
}

impl KelpState {
    pub fn fetch() -> Result<Self, Error> {
        let pool = LRT_DEPOSIT_POOL.to_vec();
        let responses = RpcBatch::new()
            .add(TotalSupply {}, RSETH_MAINNET.to_vec())
            .add(
                BalanceOf {
                    account: RSETH_OFT_ADAPTER.to_vec(),
                },
                RSETH_MAINNET.to_vec(),
            )
            .add(
                GetTotalAssetDeposits {
                    asset: STETH.to_vec(),
                },
                pool.clone(),
            )
            .add(
                GetTotalAssetDeposits {
                    asset: ETHX.to_vec(),
                },
                pool.clone(),
            )
            .add(
                GetTotalAssetDeposits {
                    asset: NATIVE_ETH.to_vec(),
                },
                pool,
            )
            .execute()
            .map_err(|err| Error::msg(format!("rpc batch failed: {err}")))?;

        let mainnet_supply = RpcBatch::decode::<_, TotalSupply>(&responses.responses[0])
            .ok_or_else(|| Error::msg("failed to decode rsETH totalSupply"))?;
        let adapter_balance = RpcBatch::decode::<_, BalanceOf>(&responses.responses[1])
            .ok_or_else(|| Error::msg("failed to decode OFT adapter rsETH balance"))?;
        let steth = RpcBatch::decode::<_, GetTotalAssetDeposits>(&responses.responses[2])
            .ok_or_else(|| Error::msg("failed to decode stETH deposits"))?;
        let ethx = RpcBatch::decode::<_, GetTotalAssetDeposits>(&responses.responses[3])
            .ok_or_else(|| Error::msg("failed to decode ETHx deposits"))?;
        let native_eth = RpcBatch::decode::<_, GetTotalAssetDeposits>(&responses.responses[4])
            .ok_or_else(|| Error::msg("failed to decode native ETH deposits"))?;

        Ok(Self {
            mainnet_supply,
            adapter_balance,
            steth,
            ethx,
            native_eth,
        })
    }
}

pub fn fetch_arb_rseth_supply() -> Result<BigInt, Error> {
    let responses = RpcBatch::new()
        .add(TotalSupply {}, RSETH_OFT_ARBITRUM.to_vec())
        .execute()
        .map_err(|err| Error::msg(format!("arbitrum rpc batch failed: {err}")))?;

    RpcBatch::decode::<_, TotalSupply>(&responses.responses[0])
        .ok_or_else(|| Error::msg("failed to decode Arbitrum rsETH OFT totalSupply"))
}
