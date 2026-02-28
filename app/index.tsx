import { View, Text, Pressable, StyleSheet ,  Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow on ghost
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return(

  <View style={styles.container}>
      {/* Background gradient layers */}
      <LinearGradient
        colors={['#0A0A14', '#0F0F1A', '#0A0A14']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-left corner glow */}
      <View style={styles.cornerGlowTL} pointerEvents="none" />
      {/* Bottom-right corner glow */}
      <View style={styles.cornerGlowBR} pointerEvents="none" />
      {/* Center ambient */}
      <View style={styles.centerGlow} pointerEvents="none" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Ghost icon with glow halo */}
        <View style={styles.iconWrapper}>
          <Animated.View style={[styles.glowHalo, { opacity: glowAnim }]} />
          <Text style={styles.ghostEmoji}>👻</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Ghost Chat</Text>

        {/* Divider line */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerDot}>◆</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.subtitle}>
          Chat with people around you{'\n'}anonymously
        </Text>

        {/* Subtle tag */}
        <BlurView intensity={20} tint="dark" style={styles.tagWrapper}>
          <Text style={styles.tag}>📍 Location-based · No account needed</Text>
        </BlurView>

        {/* CTA Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => router.push('/chat')}
            style={styles.buttonOuter}
          >
            <LinearGradient
              colors={['#7C3AED', '#6C5CE7', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Enter Area Chat</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Text style={styles.footerNote}>👥 Join nearby ghosts right now</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  cornerGlowTL: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'transparent',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 120,
    // Android
    elevation: 0,
    // Fallback for glow
    opacity: 0.35,
    // We use a View with background for Android
  },
  cornerGlowBR: {
    position: 'absolute',
    bottom: -120,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4C1D95',
    opacity: 0.15,
  },
  centerGlow: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 400,
    borderRadius: 200,
    backgroundColor: '#6C5CE7',
    opacity: 0.04,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7C3AED',
    opacity: 0.25,
    // blur sim via shadow
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  ghostEmoji: {
    fontSize: 72,
    lineHeight: 80,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 16,
    textShadowColor: 'rgba(139, 92, 246, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    width: '60%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  dividerDot: {
    color: '#6C5CE7',
    fontSize: 8,
    opacity: 0.7,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0C8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  tagWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.08)',
  },
  tag: {
    fontSize: 12,
    color: '#9D8FE0',
    letterSpacing: 0.3,
  },
  buttonOuter: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: 40,
    gap: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonArrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 18,
    fontWeight: '300',
  },
  footerNote: {
    marginTop: 24,
    fontSize: 13,
    color: 'rgba(160, 160, 200, 0.5)',
    letterSpacing: 0.2,
  },
});