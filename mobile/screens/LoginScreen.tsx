import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { THEME } from '../theme';
import { useUserStore } from '../store/userStore';

interface LoginScreenProps {
  onClose?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState(''); // for registration mode

  const setCurrentUser = useUserStore((state) => state.setCurrentUser);

  const backendUrl = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000')).replace(/\/$/, '');

  const handleAuth = async () => {
    if (!email || !password || (isRegisterMode && !name)) {
      Alert.alert('Missing Fields', 'Please fill in all details.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
      const bodyPayload = isRegisterMode
        ? { email, password, name, role: 'customer' }
        : { email, password };

      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Success - set active user state
      setCurrentUser(data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Auth Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: 'customer' | 'admin') => {
    setEmail(role === 'customer' ? 'customer@bistro.com' : 'admin@bistro.com');
    setPassword(role === 'customer' ? 'customer_123' : 'admin_123');
    setIsRegisterMode(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🍽️</Text>
          <Text style={styles.logoTitle}>THE INTELLIGENT BISTRO</Text>
          <Text style={styles.logoSubtitle}>Conversational Dining Experience</Text>
        </View>

        <Text style={styles.title}>
          {isRegisterMode ? 'Create Account' : 'Welcome Back'}
        </Text>

        {isRegisterMode && (
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={THEME.colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="enter your email..."
            placeholderTextColor={THEME.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={THEME.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.authButton}
          onPress={handleAuth}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={THEME.colors.background} />
          ) : (
            <Text style={styles.authButtonText}>
              {isRegisterMode ? 'Sign Up' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle Mode */}
        <TouchableOpacity
          onPress={() => setIsRegisterMode(!isRegisterMode)}
          style={styles.toggleContainer}
        >
          <Text style={styles.toggleText}>
            {isRegisterMode
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        {/* Quick Demo Segment */}
        <View style={styles.demoDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>QUICK DEMO ACCOUNTS</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.demoButtonsContainer}>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => handleQuickDemo('customer')}
          >
            <Text style={styles.demoButtonText}>🤵 Customer Demo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoButton, styles.demoAdminButton]}
            onPress={() => handleQuickDemo('admin')}
          >
            <Text style={styles.demoButtonText}>⚙️ Admin Demo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    width: (Platform.OS === 'web' ? '100vw' : '100%') as any,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: THEME.spacing.xs,
  },
  logoTitle: {
    color: THEME.colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  title: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: THEME.spacing.xs,
  },
  input: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    color: THEME.colors.text,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
  },
  authButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  authButtonText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleContainer: {
    marginTop: THEME.spacing.md,
    alignItems: 'center',
  },
  toggleText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  demoDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: THEME.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: THEME.spacing.sm,
    letterSpacing: 0.5,
  },
  demoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoButton: {
    flex: 0.48,
    backgroundColor: THEME.colors.chatBubbleUser,
    borderRadius: THEME.radius.sm,
    paddingVertical: THEME.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  demoAdminButton: {
    borderColor: 'rgba(220, 165, 76, 0.2)',
  },
  demoButtonText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: THEME.spacing.md,
    right: THEME.spacing.md,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: THEME.radius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  closeButtonText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
