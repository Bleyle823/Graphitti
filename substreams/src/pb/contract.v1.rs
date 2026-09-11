// @generated
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BackingSnapshot {
    #[prost(string, tag="1")]
    pub id: ::prost::alloc::string::String,
    #[prost(uint64, tag="2")]
    pub block_number: u64,
    #[prost(int64, tag="3")]
    pub timestamp: i64,
    #[prost(string, tag="4")]
    pub mainnet_supply: ::prost::alloc::string::String,
    #[prost(string, tag="5")]
    pub arb_supply: ::prost::alloc::string::String,
    #[prost(string, tag="6")]
    pub total_supply: ::prost::alloc::string::String,
    #[prost(string, tag="7")]
    pub steth_deposits: ::prost::alloc::string::String,
    #[prost(string, tag="8")]
    pub ethx_deposits: ::prost::alloc::string::String,
    #[prost(string, tag="9")]
    pub native_eth_deposits: ::prost::alloc::string::String,
    #[prost(string, tag="10")]
    pub total_backing: ::prost::alloc::string::String,
    #[prost(string, tag="11")]
    pub excess: ::prost::alloc::string::String,
    #[prost(int32, tag="12")]
    pub deviation_bps: i32,
    #[prost(bool, tag="13")]
    pub should_alert: bool,
    #[prost(int32, tag="14")]
    pub threshold_bps: i32,
    #[prost(string, tag="15")]
    pub adapter_balance: ::prost::alloc::string::String,
    #[prost(string, tag="16")]
    pub effective_supply: ::prost::alloc::string::String,
    #[prost(string, tag="17")]
    pub bridge_excess: ::prost::alloc::string::String,
    #[prost(int32, tag="18")]
    pub bridge_deviation_bps: i32,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct BackingSnapshots {
    #[prost(message, repeated, tag="1")]
    pub snapshots: ::prost::alloc::vec::Vec<BackingSnapshot>,
}
#[allow(clippy::derive_partial_eq_without_eq)]
#[derive(Clone, PartialEq, ::prost::Message)]
pub struct ArbRsethSupply {
    #[prost(string, tag="1")]
    pub supply: ::prost::alloc::string::String,
    #[prost(uint64, tag="2")]
    pub block_number: u64,
}
// @@protoc_insertion_point(module)
