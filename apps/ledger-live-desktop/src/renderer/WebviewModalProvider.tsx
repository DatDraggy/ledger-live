import { useRemoteLiveAppManifest } from "@ledgerhq/live-common/platform/providers/RemoteLiveAppProvider";
import { useLocalLiveAppManifest } from "@ledgerhq/live-common/wallet-api/LocalLiveAppProvider";
import { useSelector } from "react-redux";
import useTheme from "./hooks/useTheme";
import { useDiscreetMode } from "./components/Discreet";
import { useState } from "react";

export const WebViewModalProvider = ({ children }: { children: React.ReactNode }) => {
  const language = useSelector(languageSelector);
  const locale = useSelector(localeSelector);
  const fiatCurrency = useSelector(counterValueCurrencySelector);
  const localManifest = useLocalLiveAppManifest(DEFAULT_EARN_APP_ID);
  const remoteManifest = useRemoteLiveAppManifest(DEFAULT_EARN_APP_ID);
  const manifest = localManifest || remoteManifest;
  const themeType = useTheme().colors.palette.type;
  const discreetMode = useDiscreetMode();

  const newManifest = { ...manifest, url: `${manifest.homepageUrl}/modal` };

  console.log("BrowserWindow", { manifest, newManifest });

  const [isOpen, setIsOpen] = useState(false);
  const [uri, setUri] = useState<string | undefined>(undefined);

  const open = (uri: string) => {
    setIsOpen(true);
    setUri(uri);
  };

  const close = () => {
    setIsOpen(false);
    setUri(undefined);
  };

  {
    manifest ? (
      <Modal isOpened={true} centered bodyStyle={{ width: 600, height: 600 }} backdropColor>
        {/* <webview src={newManifest.url} style={{ width: "100%", height: "100%" }} /> */}
        <Web3AppWebview
          manifest={newManifest}
          inputs={{
            theme: themeType,
            lang: language,
            locale: locale,
            currencyTicker: fiatCurrency.ticker,
            discreetMode: discreetMode ? "true" : "false",
            OS: "web",
          }}
          // onStateChange={onStateChange}
          // ref={webviewAPIRef}
          // customHandlers={customHandlers}
          // currentAccountHistDb={currentAccountHistDb}
        />
      </Modal>
    ) : null;
  }

  //   return (
  //     <WebViewModalContext.Provider
  //       value={{ isOpen, uri, open, close }}
  //     ></WebViewModalContext.Provider>
  //   );
};
