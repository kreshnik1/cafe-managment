import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardTotals } from '../services/transactions';
import { createCafe } from '../services/cafes';
import { signOut } from '../services/auth';
import StatCard from '../components/StatCard';

interface Totals {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  cashBalance: number;
}

export default function DashboardScreen() {
  const { user, cafe, setCafe } = useAuth();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cafeName, setCafeName] = useState('');
  const [creatingCafe, setCreatingCafe] = useState(false);

  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const data = await getDashboardTotals(cafe.id);
      setTotals(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }, [cafe]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCreateCafe() {
    if (!cafeName.trim()) {
      Alert.alert('Error', 'Please enter a cafe name.');
      return;
    }
    if (!user) return;
    setCreatingCafe(true);
    try {
      const newCafe = await createCafe(cafeName.trim(), user.id);
      setCafe(newCafe);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreatingCafe(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  // No cafe yet — prompt to create one
  if (!cafe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.logo}>☕</Text>
        <Text style={styles.welcomeTitle}>Welcome!</Text>
        <Text style={styles.welcomeSub}>Let's set up your cafe.</Text>
        <TextInput
          style={styles.input}
          placeholder="Cafe name"
          placeholderTextColor="#9CA3AF"
          value={cafeName}
          onChangeText={setCafeName}
        />
        <TouchableOpacity style={styles.button} onPress={handleCreateCafe} disabled={creatingCafe}>
          {creatingCafe ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Cafe</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Today's Summary</Text>

      {totals ? (
        <View style={styles.grid}>
          <StatCard
            label="Income"
            value={`$${totals.totalIncome.toFixed(2)}`}
            color="#10B981"
            icon="↑"
          />
          <StatCard
            label="Expenses"
            value={`$${totals.totalExpenses.toFixed(2)}`}
            color="#EF4444"
            icon="↓"
          />
          <StatCard
            label="Profit"
            value={`$${totals.profit.toFixed(2)}`}
            color={totals.profit >= 0 ? '#6B4E2E' : '#EF4444'}
            icon="★"
            fullWidth
          />
          <StatCard
            label="Cash Balance"
            value={`$${totals.cashBalance.toFixed(2)}`}
            color="#3B82F6"
            icon="$"
            fullWidth
          />
        </View>
      ) : (
        <ActivityIndicator style={{ marginTop: 32 }} color="#6B4E2E" />
      )}

      <Text style={styles.hint}>Pull down to refresh • Use tabs below to navigate</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: { fontSize: 56, marginBottom: 8 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  welcomeSub: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#6B4E2E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  cafeName: { fontSize: 22, fontWeight: '700', color: '#1F2937' },
  date: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#FEE2E2', borderRadius: 8 },
  signOutText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  hint: { marginTop: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 12 },
});
