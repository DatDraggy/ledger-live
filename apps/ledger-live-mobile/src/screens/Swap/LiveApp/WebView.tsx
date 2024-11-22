import React, { useCallback, useEffect, useState } from "react";
import { LiveAppManifest } from "@ledgerhq/live-common/platform/types";
import TabBarSafeAreaView from "~/components/TabBar/TabBarSafeAreaView";
import { Web3AppWebview } from "~/components/Web3AppWebview";
import { useSwapLiveAppCustomHandlers } from "./hooks/useSwapLiveAppCustomHandlers";
import QueuedDrawer from "~/components/QueuedDrawer";
import NetworkFeeInfo from "~/components/NetworkFeeInfo";
import { Account, AccountLike, TransactionStatusCommon } from "@ledgerhq/types-live";
import { Transaction } from "@ledgerhq/live-common/generated/types";

type Props = {
  manifest: LiveAppManifest;
};

export type FeeModalState =
  | {
      opened: false;
    }
  | {
      opened: true;
      data: {
        setTransaction(transaction: Transaction): void;
        account: AccountLike;
        parentAccount: Account;
        status: TransactionStatusCommon;
        provider: undefined | string;
        disableSlowStrategy: boolean;
        transaction: Transaction;
        onRequestClose(save: boolean): Promise<void>;
      };
    };

export function WebView({ manifest }: Props) {
  const [feeModalState, setFeeModalState] = useState<FeeModalState>({ opened: false });
  const customHandlers = useSwapLiveAppCustomHandlers(manifest, setFeeModalState);

  const onModalClose = useCallback(() => {
    if (feeModalState.opened) {
      feeModalState.data.onRequestClose(false);
    }
    setFeeModalState({ opened: false });
  }, [feeModalState]);

  useEffect(() => console.log(feeModalState), [feeModalState]);
  return (
    <>
      <QueuedDrawer
        isRequestingToBeOpened={feeModalState.opened}
        preventBackdropClick={false}
        onClose={onModalClose}
      >
        <NetworkFeeInfo />
      </QueuedDrawer>
      <TabBarSafeAreaView>
        <Web3AppWebview manifest={manifest} customHandlers={customHandlers} />
      </TabBarSafeAreaView>
    </>
  );
}
