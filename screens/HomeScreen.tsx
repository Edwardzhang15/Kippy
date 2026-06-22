import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { colors, fontSizes, radii, cardShadow } from '../theme';
import { getGroupSummaries, GroupSummary } from '../db';
import { getAvatarColor, getInitials } from '../utils';
import { HomeStackParamList } from '../navigation/types';
import AnimatedFAB from '../components/AnimatedFAB';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

function GroupCard({
  group,
  index,
  isArchived,
}: {
  group: GroupSummary;
  index: number;
  isArchived: boolean;
}) {
  const navigation    = useNavigation<NavProp>();
  const { t }         = useTranslation();
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(18)).current;
  const hasPhoto = Boolean(group.destination_photo_url);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={isArchived ? styles.archivedWrap : undefined}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateAnim }] }}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            !hasPhoto && cardShadow,
            hasPhoto  && styles.photoCard,
            pressed   && styles.cardPressed,
          ]}
          onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
        >
          {hasPhoto && (
            <>
              <Image
                source={{ uri: group.destination_photo_url! }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.36)', 'rgba(0,0,0,0.68)']}
                locations={[0.38, 0.68, 1]}
                style={StyleSheet.absoluteFill}
              />
            </>
          )}

          <View style={styles.cardMain}>
            <Text
              style={[
                styles.groupName,
                hasPhoto           && styles.photoGroupName,
                isArchived && !hasPhoto && styles.groupNameMuted,
              ]}
            >
              {group.name}
            </Text>
            <Text style={[styles.totalSpent, hasPhoto && styles.photoSubText]}>
              {t('home.totalSpent', {
                amount: group.totalSpent.toLocaleString(),
                currency: group.currency,
              })}
            </Text>
            <View style={styles.avatarRow}>
              {group.members.slice(0, 5).map((m, i) => (
                <View
                  key={m.id}
                  style={[
                    styles.avatar,
                    { backgroundColor: getAvatarColor(i), marginLeft: i === 0 ? 0 : -6 },
                    hasPhoto && styles.avatarBorderPhoto,
                  ]}
                >
                  <Text style={styles.avatarText}>{getInitials(m.name)}</Text>
                </View>
              ))}
              <Text style={[styles.memberCount, hasPhoto && styles.photoSubText]}>
                {t('home.memberCount', { count: group.members.length })}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={hasPhoto ? 'rgba(255,255,255,0.75)' : colors.tabInactive}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function EmptyState({ variant }: { variant: 'active' | 'archived' }) {
  const { t }         = useTranslation();
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.emptyState, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}
    >
      <Ionicons
        name={variant === 'archived' ? 'archive-outline' : 'receipt-outline'}
        size={48}
        color={colors.border}
      />
      <Text style={styles.emptyTitle}>
        {variant === 'archived' ? t('home.emptyArchivedTitle') : t('home.emptyActiveTitle')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {variant === 'archived' ? t('home.emptyArchivedSubtitle') : t('home.emptyActiveSubtitle')}
      </Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteProp<HomeStackParamList, 'HomeScreen'>>();
  const { t }      = useTranslation();
  const [groups, setGroups]       = useState<GroupSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<'active' | 'archived'>('active');
  const [focusTick, setFocusTick] = useState(0);

  useEffect(() => {
    const initialTab = route.params?.initialTab;
    if (initialTab) {
      setTab(initialTab);
      navigation.setParams({ initialTab: undefined });
    }
  }, [route.params?.initialTab]);

  useFocusEffect(
    useCallback(() => {
      setFocusTick((n) => n + 1);
    }, []),
  );

  useEffect(() => {
    let active = true;
    getGroupSummaries(tab === 'archived').then((data) => {
      if (active) {
        setGroups(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [tab, focusTick]);

  const header = (
    <View>
      <Text style={styles.screenTitle}>{t('home.title')}</Text>
      <View style={[styles.segmentRow, cardShadow]}>
        <Pressable
          style={[styles.segment, tab === 'active' && styles.segmentSelected]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.segmentText, tab === 'active' && styles.segmentTextSelected]}>
            {t('home.tabActive')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, tab === 'archived' && styles.segmentSelected]}
          onPress={() => setTab('archived')}
        >
          <Text style={[styles.segmentText, tab === 'archived' && styles.segmentTextSelected]}>
            {t('home.tabPast')}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {!loading && (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, groups.length === 0 && { flex: 1 }]}
          ListHeaderComponent={header}
          ListEmptyComponent={<EmptyState variant={tab} />}
          renderItem={({ item, index }) => (
            <GroupCard group={item} index={index} isArchived={tab === 'archived'} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {tab === 'active' && (
        <AnimatedFAB onPress={() => navigation.navigate('CreateGroup')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 16,
  },

  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.button,
    padding: 4,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.button - 2,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.coral,
  },
  segmentText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextSelected: {
    color: '#fff',
  },

  // Plain card
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.85,
  },

  // Photo card overrides
  photoCard: {
    height: 170,
    overflow: 'hidden',
    alignItems: 'flex-end',
  },

  // Archived dim wrapper
  archivedWrap: {
    opacity: 0.62,
  },

  cardMain: {
    flex: 1,
    gap: 8,
  },
  groupName: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  groupNameMuted: {
    color: colors.textSecondary,
  },
  photoGroupName: {
    color: '#fff',
    fontWeight: '800',
  },
  totalSpent: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  photoSubText: {
    color: 'rgba(255,255,255,0.85)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatarBorderPhoto: {
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  memberCount: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    marginLeft: 10,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
});
