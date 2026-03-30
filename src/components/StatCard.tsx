import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  icon: string;
  fullWidth?: boolean;
}

export default function StatCard({ label, value, color, icon, fullWidth }: StatCardProps) {
  return (
    <View style={[styles.card, fullWidth && styles.fullWidth]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Text style={[styles.icon, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidth: { minWidth: '100%' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '700' },
});
