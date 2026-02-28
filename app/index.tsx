import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👻 Ghost Chat</Text>

      <Text style={styles.subtitle}>
        Chat with people around you anonymously
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push('/chat')}
      >
        <Text style={styles.buttonText}>Enter Area Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0F1A",
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#8B5CF6",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#A0A0B8",
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#6C5CE7",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

});
