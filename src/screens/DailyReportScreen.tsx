import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getDailyReport } from '../services/transactions';

interface DaySummary {
  day: string;
  total_income: number;
  total_expenses: number;
  profit: number;
}

function DayRow({ item }: { item: DaySummary }) {
  const date = new Date(item.day + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isProfit = item.profit >= 0;

  return (
    <View style={styles.card}>
      <Text style={styles.dayLabel}>{date}</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.colLabel}>Income</Text>
          <Text style={[styles.colValue, styles.incomeText]}>
            ${item.total_income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.col}>
          <Text style={styles.colLabel}>Expenses</Text>
          <Text style={[styles.colValue, styles.expenseText]}>
            ${item.total_expenses.toFixed(2)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.col}>
          <Text style={styles.colLabel}>Profit</Text>
          <Text style={[styles.colValue, isProfit ? styles.profitText : styles.lossText]}>
            {isProfit ? '+' : ''}${item.profit.toFixed(2)}
          </Text>
        </View>
      </View>
      {/* Progress bar: income vs expenses */}
      <View style={styles.barContainer}>
        <View
          style={[
            styles.barFill,
            {
              flex: item.total_income > 0 ? item.total_income : 1,
              backgroundColor: '#10B981',
            },
          ]}
        />
        <View
          style={[
            styles.barFill,
            {
              flex: item.total_expenses > 0 ? item.total_expenses : 0,
              backgroundColor: '#EF4444',
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function DailyReportScreen() {
  const { cafe } = useAuth();
  const [report, setReport] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const data = await getDailyReport(cafe.id);
      setReport(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
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

  // Overall totals
  const totalIncome = report.reduce((s, r) => s + r.total_income, 0);
  const totalExpenses = report.reduce((s, r) => s + r.total_expenses, 0);
  const totalProfit = totalIncome - totalExpenses;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6B4E2E" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Overall banner */}
      {report.length > 0 && (
        <View style={styles.banner}>
          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>All-time Income</Text>
            <Text style={[styles.bannerValue, styles.incomeText]}>${totalIncome.toFixed(2)}</Text>
          </View>
          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>All-time Expenses</Text>
            <Text style={[styles.bannerValue, styles.expenseText]}>${totalExpenses.toFixed(2)}</Text>
          </View>
          <View style={styles.bannerCol}>
            <Text style={styles.bannerLabel}>Net Profit</Text>
            <Text
              style={[styles.bannerValue, totalProfit >= 0 ? styles.profitText : styles.lossText]}
            >
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={report}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => <DayRow item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No data yet.</Text>
            <Text style={styles.emptyHint}>Add transactions to see daily reports.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bannerCol: { flex: 1, alignItems: 'center' },
  bannerLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  bannerValue: { fontSize: 15, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  col: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
  colLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  colValue: { fontSize: 16, fontWeight: '700' },
  incomeText: { color: '#10B981' },
  expenseText: { color: '#EF4444' },
  profitText: { color: '#6B4E2E' },
  lossText: { color: '#EF4444' },
  barContainer: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  barFill: { height: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
