import type { BigNumber } from "bignumber.js";
import type { Unit } from "@ledgerhq/types-cryptoassets";
import type {
  TransactionCommon,
  TransactionCommonRaw,
  TransactionStatusCommon,
  TransactionStatusCommonRaw,
} from "@ledgerhq/types-live";

export type NetworkInfo = {
  family: "aptos";
  serverFee: BigNumber;
  baseReserve: BigNumber;
};

export type NetworkInfoRaw = {
  family: "aptos";
  serverFee: string;
  baseReserve: string;
};

export type Transaction = TransactionCommon & {
  family: "aptos";
  fee: BigNumber | null | undefined;
  networkInfo: NetworkInfo | null | undefined;
  tag: number | null | undefined;
  feeCustomUnit: Unit | null | undefined;
};

export type TransactionRaw = TransactionCommonRaw & {
  family: "aptos";
  fee: string | null | undefined;
  networkInfo: NetworkInfoRaw | null | undefined;
  tag: number | null | undefined;
  feeCustomUnit: Unit | null | undefined;
};

export type TransactionStatus = TransactionStatusCommon;
export type TransactionStatusRaw = TransactionStatusCommonRaw;
