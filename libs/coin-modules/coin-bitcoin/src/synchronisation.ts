import type { Currency, Output as WalletOutput } from "./wallet-btc";
import { DerivationModes as WalletDerivationModes } from "./wallet-btc";
import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets";
import type { GetAccountShape } from "@ledgerhq/coin-framework/bridge/jsHelpers";
import { mergeOps } from "@ledgerhq/coin-framework/bridge/jsHelpers";
import { encodeAccountId } from "@ledgerhq/coin-framework/account/index";
import {
  isSegwitDerivationMode,
  isNativeSegwitDerivationMode,
  isTaprootDerivationMode,
} from "@ledgerhq/coin-framework/derivation";
import { BitcoinAccount, BitcoinOutput } from "./types";
import { perCoinLogic } from "./logic";
import wallet from "./wallet-btc";
import { mapTxToOperations } from "./logic";
import { DerivationMode, Operation } from "@ledgerhq/types-live";
import { decodeAccountId } from "@ledgerhq/coin-framework/account/index";
import { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import { BitcoinXPub, SignerContext } from "./signer";

// Map LL's DerivationMode to wallet-btc's
const toWalletDerivationMode = (mode: DerivationMode): WalletDerivationModes => {
  if (isTaprootDerivationMode(mode)) {
    return WalletDerivationModes.TAPROOT;
  }
  if (isNativeSegwitDerivationMode(mode)) {
    return WalletDerivationModes.NATIVE_SEGWIT;
  }
  if (isSegwitDerivationMode(mode)) {
    return WalletDerivationModes.SEGWIT;
  }
  return WalletDerivationModes.LEGACY;
};

// Map LL's currency ID to wallet-btc's Account.params.network
const toWalletNetwork = (currencyId: string): "testnet" | "mainnet" => {
  return getCryptoCurrencyById(currencyId).isTestnetFor ? "testnet" : "mainnet";
};

// Map wallet-btc's Output to LL's BitcoinOutput
const fromWalletUtxo = (utxo: WalletOutput, changeAddresses: Set<string>): BitcoinOutput => {
  return {
    hash: utxo.output_hash,
    outputIndex: utxo.output_index,
    blockHeight: utxo.block_height,
    address: utxo.address,
    value: new BigNumber(utxo.value),
    rbf: utxo.rbf,
    isChange: changeAddresses.has(utxo.address),
  };
};

// wallet-btc limitation: returns all transactions twice (for each side of the tx)
// so we need to deduplicate them...
const deduplicateOperations = (operations: (Operation | undefined)[]): Operation[] => {
  const seen = new Set();
  const out: Operation[] = [];
  let j = 0;

  for (const operation of operations) {
    if (operation) {
      if (!seen.has(operation.id)) {
        seen.add(operation.id);
        out[j++] = operation;
      }
    }
  }

  return out;
};

export function makeGetAccountShape(signerContext: SignerContext): GetAccountShape<BitcoinAccount> {
  return async info => {
    const { currency, index, derivationPath, derivationMode, initialAccount, deviceId } = info;
    // In case we get a full derivation path, extract the seed identification part
    // 44'/0'/0'/0/0 --> 44'/0'
    // FIXME Only the CLI provides a full derivationPath: why?
    const rootPath = derivationPath.split("/", 2).join("/");
    const accountPath = `${rootPath}/${index}'`;

    const paramXpub = initialAccount ? decodeAccountId(initialAccount.id).xpubOrAddress : undefined;

    const xpub = await generateXpubIfNeeded(paramXpub, {
      deviceId,
      currency,
      signerContext,
      accountPath,
    });

    const accountId = encodeAccountId({
      type: "js",
      version: "2",
      currencyId: currency.id,
      xpubOrAddress: xpub,
      derivationMode,
    });

    const walletNetwork = toWalletNetwork(currency.id);
    const walletDerivationMode = toWalletDerivationMode(derivationMode);

    const walletAccount =
      initialAccount?.bitcoinResources?.walletAccount ||
      (await wallet.generateAccount(
        {
          xpub,
          path: rootPath,
          index,
          currency: <Currency>currency.id,
          network: walletNetwork,
          derivationMode: walletDerivationMode,
        },
        currency,
      ));

    const oldOperations = initialAccount?.operations || [];
    const currentBlock = await walletAccount.xpub.explorer.getCurrentBlock();

    const blockHeight = currentBlock?.height || 0;
    await wallet.syncAccount(walletAccount, blockHeight);

    const balance = await wallet.getAccountBalance(walletAccount);
    const { txs: transactions } = await wallet.getAccountTransactions(walletAccount);

    const accountAddresses: Set<string> = new Set<string>();
    const accountAddressesWithInfo = await walletAccount.xpub.getXpubAddresses();
    accountAddressesWithInfo.forEach(a => accountAddresses.add(a.address));

    const changeAddresses: Set<string> = new Set<string>();
    const changeAddressesWithInfo = await walletAccount.xpub.storage.getUniquesAddresses({
      account: 1,
    });
    changeAddressesWithInfo.forEach(a => changeAddresses.add(a.address));

    const newOperations = transactions
      ?.map(tx => mapTxToOperations(tx, currency.id, accountId, accountAddresses, changeAddresses))
      .flat();

    const newUniqueOperations = deduplicateOperations(newOperations);
    const operations = mergeOps(oldOperations, newUniqueOperations);

    const rawUtxos = await wallet.getAccountUnspentUtxos(walletAccount);
    console.log("rawUtxos: ", JSON.stringify(rawUtxos));
    const utxos = rawUtxos.map(utxo => fromWalletUtxo(utxo, changeAddresses));

    return {
      id: accountId,
      xpub,
      balance,
      spendableBalance: balance,
      operations,
      operationsCount: operations.length,
      freshAddress: walletAccount.xpub.freshAddress,
      freshAddressPath: `${accountPath}/0/${walletAccount.xpub.freshAddressIndex}`,
      blockHeight,
      bitcoinResources: {
        utxos,
        walletAccount,
      },
    };
  };
}

type XpubGenerateParameter = {
  deviceId: string | undefined;
  currency: CryptoCurrency;
  signerContext: SignerContext;
  accountPath: string;
};
async function generateXpubIfNeeded(
  providedXpub: string | undefined,
  params: XpubGenerateParameter,
): Promise<BitcoinXPub> {
  if (providedXpub) {
    return Promise.resolve(providedXpub);
  }

  // Xpub not provided, generate it using the hwapp

  const { deviceId, currency, signerContext, accountPath } = params;
  if (deviceId === undefined || deviceId === null) {
    throw new Error("deviceId required to generate the xpub");
  }
  const { bitcoinLikeInfo } = currency;
  const { XPUBVersion: xpubVersion } = bitcoinLikeInfo as {
    // FIXME It's supposed to be optional
    //XPUBVersion?: number;
    XPUBVersion: number;
  };

  return signerContext(deviceId, currency, signer =>
    signer.getWalletXpub({
      path: accountPath,
      xpubVersion,
    }),
  );
}

export const postSync = (initial: BitcoinAccount, synced: BitcoinAccount) => {
  log("bitcoin/postSync", "bitcoinResources");
  const perCoin = perCoinLogic[synced.currency.id];
  const syncedBtc = synced;
  if (perCoin) {
    const { postBuildBitcoinResources, syncReplaceAddress } = perCoin;

    if (postBuildBitcoinResources) {
      syncedBtc.bitcoinResources = postBuildBitcoinResources(syncedBtc, syncedBtc.bitcoinResources);
    }

    if (syncReplaceAddress) {
      syncedBtc.freshAddress = syncReplaceAddress(syncedBtc.freshAddress);
      if (syncedBtc.bitcoinResources) {
        syncedBtc.bitcoinResources.utxos = syncedBtc.bitcoinResources?.utxos.map(u => ({
          ...u,
          address: u.address && syncReplaceAddress(u.address),
        }));
      }
    }
  }

  log("bitcoin/postSync", "bitcoinResources DONE");
  return syncedBtc;
};
