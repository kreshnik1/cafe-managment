import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings, Currency } from '../contexts/SettingsContext';
import { Language } from '../i18n/translations';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ── Option row ────────────────────────────────────────────────────
function OptionRow({
  label,
  sublabel,
  icon,
  iconBg,
  iconColor,
  selected,
  onPress,
}: {
  label: string;
  sublabel?: string;
  icon: IoniconsName;
  iconBg: string;
  iconColor: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.optionRow, selected && styles.optionRowSelected]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.optionBody}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
        {sublabel ? <Text style={styles.optionSublabel}>{sublabel}</Text> : null}
      </View>
      {selected ? (
        <View style={styles.checkWrap}>
          <Ionicons name="checkmark-circle" size={22} color="#6B4E2E" />
        </View>
      ) : (
        <View style={styles.checkWrap}>
          <View style={styles.emptyCheck} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Currency config ───────────────────────────────────────────────
const CURRENCIES: { value: Currency; label: string; sublabel: string; icon: IoniconsName; iconBg: string; iconColor: string }[] = [
  {
    value:      'USD',
    label:      'US Dollar',
    sublabel:   '$ — USD',
    icon:       'logo-usd',
    iconBg:     '#ECFDF5',
    iconColor:  '#059669',
  },
  {
    value:      'EUR',
    label:      'Euro',
    sublabel:   '€ — EUR',
    icon:       'cash-outline',
    iconBg:     '#EFF6FF',
    iconColor:  '#2563EB',
  },
  {
    value:      'MKD',
    label:      'Macedonian Denar',
    sublabel:   'ден — MKD',
    icon:       'wallet-outline',
    iconBg:     '#FDF8F5',
    iconColor:  '#6B4E2E',
  },
];

// ── Language config ───────────────────────────────────────────────
const LANGUAGES: { value: Language; label: string; sublabel: string; flag: string }[] = [
  { value: 'en', label: 'English',    sublabel: 'English',    flag: '🇬🇧' },
  { value: 'sq', label: 'Shqip',      sublabel: 'Albanian',   flag: '🇦🇱' },
  { value: 'mk', label: 'Македонски', sublabel: 'Macedonian', flag: '🇲🇰' },
];

// ── Screen ────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { currency, language, setCurrency, setLanguage, t } = useSettings();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Currency ──────────────────────────────────── */}
      <Text style={styles.sectionHeading}>{t('settingsCurrency').toUpperCase()}</Text>
      <View style={styles.card}>
        {CURRENCIES.map((c, idx) => (
          <View key={c.value}>
            <OptionRow
              label={c.label}
              sublabel={c.sublabel}
              icon={c.icon}
              iconBg={c.iconBg}
              iconColor={c.iconColor}
              selected={currency === c.value}
              onPress={() => setCurrency(c.value)}
            />
            {idx < CURRENCIES.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* ── Language ──────────────────────────────────── */}
      <Text style={styles.sectionHeading}>{t('settingsLanguage').toUpperCase()}</Text>
      <View style={styles.card}>
        {LANGUAGES.map((l, idx) => (
          <View key={l.value}>
            <TouchableOpacity
              style={[styles.optionRow, language === l.value && styles.optionRowSelected]}
              onPress={() => setLanguage(l.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#F3F4F6' }]}>
                <Text style={styles.flagEmoji}>{l.flag}</Text>
              </View>
              <View style={styles.optionBody}>
                <Text style={[styles.optionLabel, language === l.value && styles.optionLabelSelected]}>
                  {l.label}
                </Text>
                <Text style={styles.optionSublabel}>{l.sublabel}</Text>
              </View>
              {language === l.value ? (
                <View style={styles.checkWrap}>
                  <Ionicons name="checkmark-circle" size={22} color="#6B4E2E" />
                </View>
              ) : (
                <View style={styles.checkWrap}>
                  <View style={styles.emptyCheck} />
                </View>
              )}
            </TouchableOpacity>
            {idx < LANGUAGES.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content:   { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  sectionHeading: {
    fontSize:      11,
    fontWeight:    '700',
    color:         '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom:  8,
    marginLeft:    4,
    marginTop:     20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius:    16,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    4,
    elevation:       1,
  },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 70 },

  optionRow: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: 16,
    paddingVertical:   15,
  },
  optionRowSelected: {
    backgroundColor: '#FDF8F5',
  },

  optionIcon: {
    width:           42,
    height:          42,
    borderRadius:    12,
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     14,
    flexShrink:      0,
  },
  flagEmoji: { fontSize: 22 },

  optionBody:  { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  optionLabelSelected: { color: '#6B4E2E' },
  optionSublabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  checkWrap:  { width: 28, alignItems: 'flex-end' },
  emptyCheck: {
    width:       20,
    height:      20,
    borderRadius: 10,
    borderWidth:  1.5,
    borderColor:  '#E5E7EB',
  },
});
