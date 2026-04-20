import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../lib/api';

interface PPEItem {
  key: string;
  label: string;
  detected: boolean;
}

interface PPECheckResult {
  id?: string;
  items: Record<string, boolean>;
  score: number;
  photoUri?: string;
  createdAt?: string;
}

const PPE_ITEMS_TEMPLATE: { key: string; label: string }[] = [
  { key: 'hardHat', label: 'Hard Hat / Helmet' },
  { key: 'safetyVest', label: 'Safety Vest / Hi-Vis' },
  { key: 'safetyBoots', label: 'Safety Boots' },
  { key: 'safetyGloves', label: 'Safety Gloves' },
  { key: 'safetyGoggles', label: 'Safety Goggles' },
  { key: 'idBadge', label: 'ID Badge' },
  { key: 'toolBelt', label: 'Tool Belt' },
];

function generateSimulatedResults(): { items: Record<string, boolean>; score: number } {
  const items: Record<string, boolean> = {};
  let passed = 0;

  // Pick 1-2 random items to fail
  const failCount = Math.random() > 0.5 ? 2 : 1;
  const failIndices = new Set<number>();
  while (failIndices.size < failCount) {
    failIndices.add(Math.floor(Math.random() * PPE_ITEMS_TEMPLATE.length));
  }

  PPE_ITEMS_TEMPLATE.forEach((item, idx) => {
    const detected = !failIndices.has(idx);
    items[item.key] = detected;
    if (detected) passed++;
  });

  const score = Math.round((passed / PPE_ITEMS_TEMPLATE.length) * 100);
  return { items, score };
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

export default function PPECheckScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<{ items: PPEItem[]; score: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<PPECheckResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get<{ data: PPECheckResult[] }>('/hse/ppe-history');
      const data = (res as { data: PPECheckResult[] }).data;
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      // silent — history is supplementary
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const pickImage = useCallback(async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', `Please grant ${useCamera ? 'camera' : 'gallery'} access to continue.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [3, 4] });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setResults(null);
      setSubmitted(false);
    }
  }, []);

  const analyzeImage = useCallback(() => {
    setAnalyzing(true);
    setResults(null);
    setSubmitted(false);

    // Simulated AI analysis — 2.5s delay
    setTimeout(() => {
      const { items, score } = generateSimulatedResults();
      const mapped: PPEItem[] = PPE_ITEMS_TEMPLATE.map((t) => ({
        key: t.key,
        label: t.label,
        detected: items[t.key],
      }));
      setResults({ items: mapped, score });
      setAnalyzing(false);
    }, 2500);
  }, []);

  const submitCheck = useCallback(async () => {
    if (!results) return;
    setSubmitting(true);
    try {
      const itemsRecord: Record<string, boolean> = {};
      results.items.forEach((i) => {
        itemsRecord[i.key] = i.detected;
      });

      await api.post('/hse/ppe-check', {
        items: itemsRecord,
        score: results.score,
        photoUri: imageUri ?? undefined,
      });

      setSubmitted(true);
      fetchHistory();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit PPE check';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  }, [results, imageUri, fetchHistory]);

  const resetCheck = useCallback(() => {
    setImageUri(null);
    setResults(null);
    setSubmitted(false);
    setAnalyzing(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="body" size={28} color="#3b82f6" />
          <Text style={styles.pageTitle}>PPE Compliance Check</Text>
        </View>
        <Text style={styles.subtitle}>
          Take a photo or upload from gallery to verify PPE compliance
        </Text>

        {/* Camera / Upload Section */}
        {!imageUri ? (
          <View style={styles.uploadSection}>
            <View style={styles.cameraPlaceholder}>
              <Ionicons name="camera-outline" size={64} color="#475569" />
              <Text style={styles.placeholderText}>No photo selected</Text>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage(true)}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Take Photo for PPE Check</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
              <Ionicons name="images-outline" size={20} color="#94a3b8" />
              <Text style={styles.secondaryButtonText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewSection}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.changeButton} onPress={resetCheck}>
                <Ionicons name="refresh" size={16} color="#94a3b8" />
                <Text style={styles.changeButtonText}>Change Photo</Text>
              </TouchableOpacity>
              {!results && !analyzing && (
                <TouchableOpacity style={styles.analyzeButton} onPress={analyzeImage}>
                  <Ionicons name="scan" size={20} color="#fff" />
                  <Text style={styles.analyzeButtonText}>Analyze PPE Compliance</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Analyzing Indicator */}
        {analyzing && (
          <View style={styles.analyzingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.analyzingText}>AI Analyzing your PPE...</Text>
            <Text style={styles.analyzingSubtext}>Checking for safety equipment compliance</Text>
          </View>
        )}

        {/* Results Section */}
        {results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Analysis Results</Text>

            {/* Score */}
            <View style={styles.scoreContainer}>
              <Text style={[styles.scoreValue, { color: getScoreColor(results.score) }]}>
                {results.score}%
              </Text>
              <Text style={styles.scoreLabel}>Compliance Score</Text>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColor(results.score) + '20' },
                ]}
              >
                <Text style={[styles.scoreBadgeText, { color: getScoreColor(results.score) }]}>
                  {results.score >= 80 ? 'COMPLIANT' : results.score >= 60 ? 'PARTIAL' : 'NON-COMPLIANT'}
                </Text>
              </View>
            </View>

            {/* Checklist */}
            <View style={styles.checklistContainer}>
              {results.items.map((item) => (
                <View key={item.key} style={styles.checklistRow}>
                  <View style={styles.checklistIcon}>
                    {item.detected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                    ) : (
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    )}
                  </View>
                  <Text style={styles.checklistLabel}>{item.label}</Text>
                  <Text
                    style={[
                      styles.checklistStatus,
                      { color: item.detected ? '#22c55e' : '#ef4444' },
                    ]}
                  >
                    {item.detected ? 'Detected' : 'Not Detected'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Submit */}
            {!submitted ? (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={submitCheck}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit PPE Check</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.submittedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.submittedText}>PPE Check Submitted Successfully</Text>
              </View>
            )}
          </View>
        )}

        {/* History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent PPE Checks</Text>
          {loadingHistory ? (
            <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 12 }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="document-text-outline" size={32} color="#475569" />
              <Text style={styles.emptyHistoryText}>No previous PPE checks</Text>
            </View>
          ) : (
            history.slice(0, 5).map((check, index) => (
              <View key={check.id ?? index} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Ionicons
                    name={check.score >= 80 ? 'checkmark-circle' : 'warning'}
                    size={20}
                    color={getScoreColor(check.score)}
                  />
                  <Text style={styles.historyScore}>{check.score}%</Text>
                </View>
                <Text style={styles.historyDate}>
                  {check.createdAt
                    ? new Date(check.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Unknown date'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },

  // Upload section
  uploadSection: {
    gap: 12,
    marginBottom: 20,
  },
  cameraPlaceholder: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    gap: 8,
  },
  placeholderText: {
    color: '#475569',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },

  // Preview
  previewSection: {
    marginBottom: 20,
    gap: 12,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#1e293b',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  changeButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  analyzeButton: {
    flex: 2,
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Analyzing
  analyzingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  analyzingText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
  },
  analyzingSubtext: {
    color: '#94a3b8',
    fontSize: 13,
  },

  // Results
  resultsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  scoreBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Checklist
  checklistContainer: {
    gap: 1,
    marginBottom: 20,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  checklistIcon: {
    marginRight: 10,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },
  checklistStatus: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Submit
  submitButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submittedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e20',
    paddingVertical: 14,
    borderRadius: 12,
  },
  submittedText: {
    color: '#22c55e',
    fontSize: 15,
    fontWeight: '600',
  },

  // History
  historySection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  emptyHistory: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  emptyHistoryText: {
    color: '#475569',
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyScore: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  historyDate: {
    color: '#94a3b8',
    fontSize: 13,
  },
});
