export type ExplorerConfig = {
  chainId: number;
  chainType?: string | null;
  explorerUrl: string | null;
  explorerAddressPath: string | null;
  explorerTxPath: string | null;
  explorerContractPath: string | null;
  explorerApiUrl: string | null;
  explorerApiType: string | null;
  backupExplorerUrl?: string | null;
  backupExplorerAddressPath?: string | null;
  backupExplorerTxPath?: string | null;
  backupExplorerContractPath?: string | null;
  backupExplorerApiUrl?: string | null;
  backupExplorerApiType?: string | null;
  backupExplorerApiKey?: string | null;
  backupExplorerApiKeyNeeded?: boolean | null;
};
