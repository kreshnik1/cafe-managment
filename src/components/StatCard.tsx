import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface StatCardProps {
  label:      string;
  value:      string;
  color:      string;
  icon:       IoniconsName;
  fullWidth?: boolean;
  trend?:     'up' | 'down' | 'neutral'; // optional trend indicator
  subLabel?:  string;                     // optional secondary text
}

export default function StatCard({ label, value, color, icon, fullWidth, trend, subLabel }: StatCardProps) {
  return (
    <View style={[styles.card, fullWidth && styles.fullWidth]}>
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, trend === 'up' ? styles.trendUp : trend === 'down' ? styles.trendDown : styles.trendNeutral]}>
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
              size={11}
              color={trend === 'up' ? '#059669' : trend === 'down' ? '#DC2626' : '#6B7280'}
            />
          </View>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  fullWidth: { minWidth: '100%' },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendUp:      { backgroundColor: '#ECFDF5' },
  trendDown:    { backgroundColor: '#FEF2F2' },
  trendNeutral: { backgroundColor: '#F9FAFB' },
  label:    { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  value:    { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});
