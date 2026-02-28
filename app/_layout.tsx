import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
     screenOptions={{
      headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: "#0F0F1A",
        },
        headerTintColor: "#8B5CF6", // back arrow color
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          color: "#FFFFFF",
        },
        headerShadowVisible: false, // remove bottom line
      }}>
      <Stack.Screen
        name="index"
        options={{ title: '👻 Ghost Chat' }}
      />
      <Stack.Screen
        name="chat"
        options={{ title: 'Area Chat' }}
      />
    </Stack>
  );
}
