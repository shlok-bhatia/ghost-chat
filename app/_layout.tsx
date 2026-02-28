import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Ghost Chat' }}
      />
      <Stack.Screen
        name="chat"
        options={{ title: 'Area Chat' }}
      />
    </Stack>
  );
}
