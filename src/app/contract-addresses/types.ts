export type ContractAddressEntry = {
  id: string;
  name: string;
  address: string;
  description: string;
  tags: string[];
  explorerUrl: string;
};

export type ContractAddressGroup = {
  id: string;
  title: string;
  description: string;
  contracts: ContractAddressEntry[];
};
