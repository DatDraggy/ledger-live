import React, { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { ScreenName } from "~/const";
import { getStackNavigatorConfig } from "~/navigation/navigatorConfig";
import { track } from "~/analytics";
import { AssetsNavigatorParamsList } from "./types";
import AssetsList from "./screens/AssetsList";
import { NavigationHeaderBackButton } from "~/components/NavigationHeaderBackButton";

export default function Navigator() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const goBack = useCallback(() => {
    track("button_clicked", {
      button: "Back",
    });
    navigation.goBack();
  }, [navigation]);

  const stackNavigationConfig = useMemo(
    () => ({
      ...getStackNavigatorConfig(colors, true),
      headerLeft: () => <NavigationHeaderBackButton onPress={goBack} />,
    }),
    [colors, goBack],
  );

  return (
    <Stack.Navigator
      screenOptions={{
        ...stackNavigationConfig,
        gestureEnabled: Platform.OS === "ios",
      }}
    >
      <Stack.Screen
        name={ScreenName.AssetsList}
        component={AssetsList}
        options={{
          headerTitle: "",
          headerRight: () => null,
        }}
      />
    </Stack.Navigator>
  );
}

const Stack = createStackNavigator<AssetsNavigatorParamsList>();
