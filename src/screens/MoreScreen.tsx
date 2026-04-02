import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { signOut } from '../services/auth';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ── Menu row ──────────────────────────────────────────────────────
function MenuRow({
  title,
  subtitle,
  icon,
  color,
  bg,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: IoniconsName;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[rowStyles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={rowStyles.body}>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={rowStyles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { cafe, user } = useAuth();
  const { t } = useSettings();

  async function handleSignOut() {
    Alert.alert(t('signOutTitle'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: async () => {
          try { await signOut(); } catch (err: any) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  }

  const cafeName  = cafe?.name ?? 'My Cafe';
  const userEmail = user?.email ?? '';

  // Build sections dynamically so labels respond to language changes
  const MENU_SECTIONS = [
    {
      heading: t('moreAnalytics'),
      items: [
        {
          title:    t('statisticsMenuItem'),
          subtitle: t('statisticsMenuSub'),
          icon:     'bar-chart-outline' as IoniconsName,
          color:    '#3B82F6',
          bg:       '#EFF6FF',
          screen:   'Statistics',
        },
      ],
    },
    {
      heading: t('moreInventorySection'),
      items: [
        {
          title:    t('purchaseOrdersMenuItem'),
          subtitle: t('purchaseOrdersMenuSub'),
          icon:     'cube-outline' as IoniconsName,
          color:    '#059669',
          bg:       '#ECFDF5',
          screen:   'PurchaseOrders',
        },
      ],
    },
    {
      heading: t('moreTeam'),
      items: [
        {
          title:    t('staffMenuItem'),
          subtitle: t('staffMenuSub'),
          icon:     'people-outline' as IoniconsName,
          color:    '#6B4E2E',
          bg:       '#FDF8F5',
          screen:   'Staff',
        },
      ],
    },
    {
      heading: t('moreSettingsSection'),
      items: [
        {
          title:    t('settingsMenuItem'),
          subtitle: t('settingsMenuSub'),
          icon:     'settings-outline' as IoniconsName,
          color:    '#6B7280',
          bg:       '#F3F4F6',
          screen:   'Settings',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ─────────────────────────────────────── */}
        <Text style={styles.pageTitle}>{t('moreTitle')}</Text>

        {/* ── Cafe profile card ──────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(cafeName)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{cafeName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{userEmail}</Text>
          </View>
          <View style={styles.profileBadge}>
            <Ionicons name="storefront-outline" size={14} color="#6B4E2E" />
            <Text style={styles.profileBadgeText}>{t('ownerBadge')}</Text>
          </View>
        </View>

        {/* ── Menu sections ──────────────────────────────────── */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading.toUpperCase()}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <View key={item.screen}>
                  <MenuRow
                    title={item.title}
                    subtitle={item.subtitle}
                    icon={item.icon}
                    color={item.color}
                    bg={item.bg}
                    onPress={() => navigation.navigate(item.screen)}
                  />
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Sign out ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={rowStyles.row} onPress={handleSignOut} activeOpacity={0.7}>
              <View style={[rowStyles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              </View>
              <View style={rowStyles.body}>
                <Text style={[rowStyles.title, { color: '#EF4444' }]}>{t('signOut')}</Text>
                <Text style={rowStyles.subtitle}>{t('signOutSub')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 20,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#6B4E2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  profileEmail: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 3,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    marginLeft: 10,
    flexShrink: 0,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B4E2E',
  },

  section: { marginBottom: 20 },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 70 },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
