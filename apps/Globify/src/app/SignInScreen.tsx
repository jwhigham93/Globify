import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { color, space, type, surface } from '../components/ui/theme';
import { useAuth } from './AuthProvider';

export const SignInScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Globify</Text>
        <Text style={styles.subtitle}>Supply Chain Visualization</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={signInWithGoogle}
          activeOpacity={0.85}
          testID="sign-in-google"
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          <Image
            source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    ...surface.panel,
    width: '100%',
    maxWidth: 360,
    padding: 32,
    alignItems: 'center',
  },
  title: {
    ...type.title,
    fontSize: 28,
    marginBottom: space.xs,
  },
  subtitle: {
    ...type.body,
    color: color.textDim,
    marginBottom: 40,
  },
  googleButton: {
    ...surface.button,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.line,
    borderColor: color.line,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    ...type.button,
    color: color.inverse,
  },
});
