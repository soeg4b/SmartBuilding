import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../lib/api';
import type { HSEStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<HSEStackParamList, 'HSEChecklist'>;

const CHECKLIST_QUESTIONS: { key: string; label: string }[] = [
  { key: 'feelingWell', label: 'Are you feeling physically well today?' },
  { key: 'adequateRest', label: 'Did you get adequate rest (minimum 7 hours)?' },
  { key: 'freeFromSubstances', label: 'Are you free from the influence of alcohol or drugs?' },
  { key: 'noInjuries', label: 'Do you have any injuries that might affect your work?' },
  { key: 'safetyBriefing', label: 'Are you aware of today\'s safety briefing?' },
  { key: 'ppeInspected', label: 'Have you inspected your PPE?' },
  { key: 'safetyCertifications', label: 'Do you have your required safety certifications on-site?' },
  { key: 'emergencyProcedures', label: 'Are you familiar with emergency procedures for your work area?' },
  { key: 'safetyTraining', label: 'Have you completed required safety training for today\'s tasks?' },
  { key: 'consentInspection', label: 'Do you consent to random safety inspection during your shift?' },
];

interface ChecklistStatus {
  submitted: boolean;
  answers?: Record<string, boolean>;
  clearedForWork?: boolean;
}

export default function HSEChecklistScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [answers, setAnswers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CHECKLIST_QUESTIONS.forEach((q) => {
      initial[q.key] = false;
    });
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [clearedForWork, setClearedForWork] = useState<boolean | null>(null);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fetchTodayStatus = useCallback(async () => {
    try {
      const res = await api.get<{ data: ChecklistStatus }>('/hse/checklist/today');
      const data = (res as { data: ChecklistStatus }).data;
      if (data.submitted) {
        setAlreadySubmitted(true);
        setClearedForWork(data.clearedForWork ?? null);
        if (data.answers) {
          setAnswers(data.answers);
        }
      }
    } catch {
      // First time today — that's fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  const toggleAnswer = useCallback((key: string) => {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await api.post<{ data: { clearedForWork: boolean } }>('/hse/checklist', {
        answers,
      });
      const data = (res as { data: { clearedForWork: boolean } }).data;
      setClearedForWork(data.clearedForWork);
      setAlreadySubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit checklist';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  }, [answers]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading checklist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={28} color="#3b82f6" />
          <Text style={styles.pageTitle}>Daily HSE Checklist</Text>
        </View>
        <Text style={styles.dateText}>{todayStr}</Text>

        {/* Cleared / Not Cleared Banner */}
        {alreadySubmitted && clearedForWork !== null && (
          <View
            style={[
              styles.statusBanner,
              clearedForWork ? styles.clearedBanner : styles.notClearedBanner,
            ]}
          >
            <Ionicons
              name={clearedForWork ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={clearedForWork ? '#22c55e' : '#ef4444'}
            />
            <View style={styles.statusTextContainer}>
              <Text
                style={[
                  styles.statusTitle,
                  { color: clearedForWork ? '#22c55e' : '#ef4444' },
                ]}
              >
                {clearedForWork ? 'CLEARED FOR WORK' : 'NOT CLEARED FOR WORK'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {clearedForWork
                  ? 'You have passed today\'s health and safety checklist.'
                  : 'Please contact your supervisor before commencing work.'}
              </Text>
            </View>
          </View>
        )}

        {/* Questions */}
        <View style={styles.questionsContainer}>
          {CHECKLIST_QUESTIONS.map((q, index) => (
            <View key={q.key} style={styles.questionRow}>
              <View style={styles.questionLeft}>
                <Text style={styles.questionNumber}>{index + 1}</Text>
                <Text style={styles.questionLabel}>{q.label}</Text>
              </View>
              <Switch
                value={answers[q.key]}
                onValueChange={() => toggleAnswer(q.key)}
                disabled={alreadySubmitted}
                trackColor={{ false: '#475569', true: '#22c55e80' }}
                thumbColor={answers[q.key] ? '#22c55e' : '#94a3b8'}
              />
            </View>
          ))}
        </View>

        {/* Submit Button */}
        {!alreadySubmitted && (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Checklist</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* PPE Check Link */}
        <TouchableOpacity
          style={styles.ppeLink}
          onPress={() => navigation.navigate('PPECheck')}
        >
          <View style={styles.ppeLinkContent}>
            <View style={styles.ppeLinkLeft}>
              <View style={styles.ppeLinkIcon}>
                <Ionicons name="body" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.ppeLinkTitle}>PPE Compliance Check</Text>
                <Text style={styles.ppeLinkSubtitle}>Verify your safety equipment with AI</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
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
  dateText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  clearedBanner: {
    backgroundColor: '#22c55e10',
    borderColor: '#22c55e40',
  },
  notClearedBanner: {
    backgroundColor: '#ef444410',
    borderColor: '#ef444440',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },

  // Questions
  questionsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 20,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  questionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
    gap: 10,
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b82f6',
    width: 20,
    marginTop: 1,
  },
  questionLabel: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },

  // Submit
  submitButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // PPE Link
  ppeLink: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  ppeLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ppeLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ppeLinkIcon: {
    backgroundColor: '#3b82f620',
    borderRadius: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ppeLinkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  ppeLinkSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
