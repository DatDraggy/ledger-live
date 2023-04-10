import BigNumber from "bignumber.js";
import { TxnBuilderTypes } from "aptos";
import type { Account } from "@ledgerhq/types-live";

import { AptosAPI } from "./api";
import { DEFAULT_GAS, DEFAULT_GAS_PRICE } from "./logic";
import type { Transaction } from "./types";

const buildTransaction = async (
  account: Account,
  transaction: Transaction,
  aptosClient: AptosAPI
): Promise<TxnBuilderTypes.RawTransaction> => {
  const amount = transaction.useAllAmount
    ? getMaxSendBalance(
        account.spendableBalance,
        new BigNumber(DEFAULT_GAS + 2000),
        new BigNumber(DEFAULT_GAS_PRICE)
      )
    : transaction.amount;

  const txPayload = getPayload(transaction.recipient, amount);
  const tx = await aptosClient.generateTransaction(
    account.freshAddresses[0].address,
    txPayload,
    {
      max_gas_amount: transaction.gasLimit || DEFAULT_GAS.toString(),
      gas_unit_price: transaction.gasUnitPrice || DEFAULT_GAS_PRICE.toString(),
    }
  );

  return tx;
};

const getMaxSendBalance = (
  amount: BigNumber,
  gas: BigNumber,
  gasPrice: BigNumber
) => {
  const totalGas = new BigNumber(gas).multipliedBy(BigNumber(gasPrice));

  if (amount.gt(totalGas)) return amount.minus(totalGas);
  return amount;
};

const getPayload = (sendTo: string, amount: BigNumber) => {
  return {
    function: "0x1::aptos_account::transfer",
    type_arguments: [],
    arguments: [sendTo, amount.toString()],
  };
};

export default buildTransaction;
