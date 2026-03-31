import { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const [user, token] = await Promise.all([
        AsyncStorage.getItem('aquaprana_user'),
        AsyncStorage.getItem('aquaprana_token'),
      ]);
      if (user && token) {
        router.replace('/(tabs)/');
      }
    } catch {
      // No session found, stay on splash
    }
  }

  function handleGetStarted() {
    router.push('/auth/login');
  }

  return (
    <View style={styles.container}>
      {/* Top section — blue background */}
      <SafeAreaView style={styles.heroSection}>
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Ionicons name="water" size={80} color="#1E7AB8" />
        </View>

        <Text style={styles.appName}>AquaPrana</Text>
        <Text style={styles.tagline}>Smart Aquaculture Management</Text>
      </SafeAreaView>

      {/* Features section */}
      <View style={styles.featuresSection}>
        <FeatureRow
          icon="water-outline"
          title="Monitor Water Quality"
          subtitle="Real-time parameters at your fingertips"
        />
        <FeatureRow
          icon="fish-outline"
          title="Track Growth Cycles"
          subtitle="Manage stocking, feeding & harvest data"
        />
        <FeatureRow
          icon="notifications-outline"
          title="Smart Alerts"
          subtitle="Get notified when action is needed"
        />
      </View>

      {/* Bottom CTA */}
      <SafeAreaView style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.versionText}>v0.2</Text>
      </SafeAreaView>
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={24} color="#1E7AB8" />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E7AB8',
  },
  heroSection: {
    backgroundColor: '#1E7AB8',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#d0e9f7',
    fontWeight: '400',
    textAlign: 'center',
  },
  featuresSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 16,
    gap: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#e8f4fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 13,
    color: '#718096',
  },
  bottomSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E7AB8',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    minHeight: 56,
    gap: 8,
    shadowColor: '#1E7AB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  versionText: {
    marginTop: 14,
    fontSize: 12,
    color: '#718096',
  },
});
