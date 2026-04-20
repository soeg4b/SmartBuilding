import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';

const DEMO_ACCOUNTS = [
  { label: 'Sys Admin',        email: 'admin@integra.com',    password: 'admin123' },
  { label: 'CFO / Executive',  email: 'cfo@integra.com',      password: 'cfo123' },
  { label: 'Technician',       email: 'tech@integra.com',     password: 'tech123' },
  { label: 'Building Manager', email: 'manager@integra.com',  password: 'manager123' },
  { label: 'Security',         email: 'security@integra.com', password: 'security123' },
  { label: 'Tenant',           email: 'tenant@integra.com',   password: 'tenant123' },
  { label: 'Hotel Guest',      email: 'guest@integra.com',    password: 'guest123' },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.logoSection}>
          <View style={styles.logoWrap}>
            <Ionicons name="business" size={40} color="#22d3ee" />
          </View>
          <Text style={styles.title}>INTEGRA</Text>
          <Text style={styles.subtitle}>Total Building Resource Dashboard</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>DEMO ACCOUNTS · tap to autofill</Text>
            {DEMO_ACCOUNTS.map((a) => (
              <TouchableOpacity
                key={a.email}
                style={styles.demoRow}
                onPress={() => { setEmail(a.email); setPassword(a.password); }}
                disabled={loading}
              >
                <Text style={styles.demoLabel}>{a.label}</Text>
                <Text style={styles.demoEmail}>{a.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>INTEGRA · Project TBRD v1.0</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#f8fafc',
  },
  loginBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  demoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22d3ee',
    letterSpacing: 1,
    marginBottom: 8,
  },
  demoRow: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  demoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  demoEmail: {
    fontSize: 11,
    color: '#94a3b8',
  },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginTop: 40,
  },
});
