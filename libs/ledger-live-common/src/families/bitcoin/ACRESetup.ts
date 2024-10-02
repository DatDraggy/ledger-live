// Goal of this file is to inject all necessary device/signer dependency to coin-modules

import { firstValueFrom, from } from "rxjs";
import Transport from "@ledgerhq/hw-transport";
import { Account, AnyMessage, Bridge } from "@ledgerhq/types-live";
import { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import Acre from "@blooo/hw-app-acre";
import { createBridges } from "@ledgerhq/coin-bitcoin/bridge/js";
import type { BitcoinSignature, SignerContext } from "@ledgerhq/coin-bitcoin/signer";
import makeCliTools from "@ledgerhq/coin-bitcoin/cli-transaction";
import bitcoinResolver from "@ledgerhq/coin-bitcoin/hw-getAddress";
import { signMessage } from "@ledgerhq/coin-bitcoin/hw-signMessage";
import { BitcoinAccount, Transaction, TransactionStatus } from "@ledgerhq/coin-bitcoin/types";
import { GetAddressOptions, Resolver } from "../../hw/getAddress/types";
import { withDevice } from "../../hw/deviceAccess";
import { GetAddressFn } from "@ledgerhq/coin-framework/bridge/getAddressWrapper";
import { getCurrencyConfiguration } from "../../config";
import { BitcoinConfigInfo } from "@ledgerhq/coin-bitcoin/lib/config";
import { SignMessage } from "../../hw/signMessage/types";
import { AcreMessageWithdraw } from "@ledgerhq/wallet-api-acre-module";

const createSigner = (transport: Transport, currency: CryptoCurrency) => {
  return new Acre({ transport, currency: currency.id });
};

const signerContext: SignerContext = <T>(
  deviceId: string,
  crypto: CryptoCurrency,
  fn: (signer: Acre) => Promise<T>,
): Promise<T> =>
  firstValueFrom(
    withDevice(deviceId)((transport: Transport) => from(fn(createSigner(transport, crypto)))),
  );

const getCurrencyConfig = (currency: CryptoCurrency) => {
  return { info: getCurrencyConfiguration<BitcoinConfigInfo>(currency) };
};

const bridge: Bridge<Transaction, BitcoinAccount, TransactionStatus> = createBridges(
  signerContext,
  getCurrencyConfig,
);

export function createMessageSigner(): SignMessage {
  return (transport, account, messageData) => {
    const signerContext: SignerContext = (_, crypto, fn) => fn(createSigner(transport, crypto));
    return signMessage(signerContext)("", account, messageData);
  };
}

export function createWithdrawSigner(): SignMessage {
  const signWithdraw =
    (signerContext: SignerContext) =>
    async (deviceId: string, account: Account, container: AcreMessageWithdraw & AnyMessage) => {
      const path =
        "path" in container && container.path ? container.path : account.freshAddressPath;
      const result = (await signerContext(deviceId, account.currency, signer =>
        (signer as unknown as Acre).signWithdrawal(path, container.message),
      )) as BitcoinSignature;
      const v = result["v"] + 27 + 4;
      const signature = `${v.toString(16)}${result["r"]}${result["s"]}`;
      return {
        rsv: result,
        signature,
      };
    };

  return (transport, account, messageData) => {
    const signerContext: SignerContext = (_, crypto, fn) => fn(createSigner(transport, crypto));
    return signWithdraw(signerContext)(
      "",
      account,
      messageData as unknown as AcreMessageWithdraw & AnyMessage,
    );
  };
}

const messageSigner = {
  signMessage: createMessageSigner(),
  signWithdraw: createWithdrawSigner(),
};

const resolver: Resolver = (
  transport: Transport,
  addressOpt: GetAddressOptions,
): ReturnType<GetAddressFn> => {
  const signerContext: SignerContext = (_, crypto, fn) => fn(createSigner(transport, crypto));
  return bitcoinResolver(signerContext)("", addressOpt);
};

const cliTools = makeCliTools();

export { bridge, cliTools, resolver, messageSigner, signerContext };
