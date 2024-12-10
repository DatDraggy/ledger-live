import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { NavigatorName, ScreenName } from "~/const";
import AssetsListNavigator from "LLM/features/Assets/Navigator";
import { BaseNavigatorStackParamList } from "~/components/RootNavigator/types/BaseNavigator";
import { MockedAccounts } from "./mockedAccount";
import AccountsListView from "LLM/features/Accounts/components/AccountsListView";
import { State } from "~/reducers/types";

const Stack = createStackNavigator<BaseNavigatorStackParamList>();
const AccountStack = createStackNavigator();

const AccountNavigator = () => (
  <AccountStack.Navigator>
    <AccountStack.Screen
      name={ScreenName.AccountsList}
      component={AccountsListView}
      options={{ headerShown: false }}
    />
  </AccountStack.Navigator>
);

const TestNavigator = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <NavigationContainer independent={true}>
      <Stack.Navigator>
        <Stack.Screen name={ScreenName.MockedWalletScreen} options={{ headerShown: false }}>
          {() => children}
        </Stack.Screen>
        <Stack.Screen
          name={NavigatorName.Assets}
          component={AssetsListNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={NavigatorName.Accounts}
          component={AccountNavigator}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  </QueryClientProvider>
);

export const SlicedMockedAccounts = {
  ...MockedAccounts,
  active: MockedAccounts.active.slice(0, 3),
};

export const INITIAL_STATE = {
  overrideInitialState: (state: State) => ({
    ...state,
    accounts: MockedAccounts,
    settings: {
      ...state.settings,
      readOnlyModeEnabled: false,
      overriddenFeatureFlags: {
        llmAccountListUI: {
          enabled: true,
        },
      },
    },
  }),
};

export default TestNavigator;
