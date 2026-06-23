import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
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
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getGroupSummaries, archiveGroup, deleteGroup, GroupSummary } from '../db';
import { getAvatarColor, getInitials } from '../utils';
import { HomeStackParamList } from '../navigation/types';
import AnimatedFAB from '../components/AnimatedFAB';
import ActionSheet, { SheetOption } from '../components/ActionSheet';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: 24,
    marginBottom: 16,
  },

  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: c.card,
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
    backgroundColor: c.coral,
  },
  segmentText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  segmentTextSelected: {
    color: '#fff',
  },

  // Plain card
  card: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPadRight: {
    paddingRight: 46,
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
    color: c.textPrimary,
  },
  groupNameMuted: {
    color: c.textSecondary,
  },
  photoGroupName: {
    color: '#fff',
    fontWeight: '800',
  },
  totalSpent: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
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
    borderColor: c.card,
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
    color: c.textSecondary,
    marginLeft: 10,
  },

  // Three-dot menu button
  menuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  menuBtnPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    top: 10,
    right: 10,
  },

  // Plan with Kip card
  planWithKipCard: {
    borderRadius: radii.card,
    overflow: 'hidden',
    marginBottom: 20,
  },
  planWithKipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingVertical: 14,
  },
  planWithKipBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  planWithKipBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
  },
  planWithKipTitle: {
    fontSize: fontSizes.body,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  planWithKipSub: {
    fontSize: fontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  planWithKipImageWrapper: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planWithKipImage: {
    width: 72,
    height: 72,
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
    color: c.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
  },
});

function GroupCard({
  group,
  index,
  isArchived,
  onConclude,
  onDelete,
}: {
  group: GroupSummary;
  index: number;
  isArchived: boolean;
  onConclude: () => void;
  onDelete: () => void;
}) {
  const navigation    = useNavigation<NavProp>();
  const { t }         = useTranslation();
  const { colors }    = useTheme();
  const styles        = makeStyles(colors);
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(18)).current;
  const hasPhoto      = Boolean(group.destination_photo_url);
  const [showSheet, setShowSheet] = useState(false);

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

  const sheetOptions: SheetOption[] = isArchived
    ? [
        { label: t('home.menuEdit'), onPress: () => navigation.navigate('EditTrip', { groupId: group.id }) },
        { label: t('home.menuDelete'), destructive: true, onPress: onDelete },
      ]
    : [
        { label: t('home.menuEdit'), onPress: () => navigation.navigate('EditTrip', { groupId: group.id }) },
        { label: t('home.menuConclude'), onPress: onConclude },
        { label: t('home.menuDelete'), destructive: true, onPress: onDelete },
      ];

  const openMenu = () => {
    if (Platform.OS === 'ios') {
      const labels = isArchived
        ? [t('home.menuEdit'), t('home.menuDelete'), t('common.cancel')]
        : [t('home.menuEdit'), t('home.menuConclude'), t('home.menuDelete'), t('common.cancel')];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: isArchived ? 1 : 2,
        },
        (idx) => {
          if (idx === 0) navigation.navigate('EditTrip', { groupId: group.id });
          else if (isArchived && idx === 1) onDelete();
          else if (!isArchived && idx === 1) onConclude();
          else if (!isArchived && idx === 2) onDelete();
        },
      );
    } else {
      setShowSheet(true);
    }
  };

  return (
    <View style={isArchived ? styles.archivedWrap : undefined}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateAnim }] }}>
        <View>
          <Pressable
            style={({ pressed }) => [
              styles.card,
              !hasPhoto && cardShadow,
              !hasPhoto && styles.cardPadRight,
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
          </Pressable>

          {/* Three-dot menu button — sibling of card Pressable so it isn't clipped */}
          <Pressable
            style={[styles.menuBtn, hasPhoto && styles.menuBtnPhoto]}
            onPress={openMenu}
            hitSlop={8}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={hasPhoto ? 'rgba(255,255,255,0.85)' : colors.textSecondary}
            />
          </Pressable>
        </View>

        <ActionSheet
          visible={showSheet}
          options={sheetOptions}
          cancelLabel={t('common.cancel')}
          onCancel={() => setShowSheet(false)}
        />
      </Animated.View>
    </View>
  );
}

function EmptyState({ variant }: { variant: 'active' | 'archived' }) {
  const { t }         = useTranslation();
  const { colors }    = useTheme();
  const styles        = makeStyles(colors);
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
  const { colors } = useTheme();
  const styles     = makeStyles(colors);
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

  const handleConclude = (group: GroupSummary) => {
    Alert.alert(
      t('groupDetail.concludeTitle'),
      t('groupDetail.concludeMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('groupDetail.conclude'),
          onPress: async () => {
            await archiveGroup(group.id);
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
          },
        },
      ],
    );
  };

  const handleDelete = (group: GroupSummary) => {
    Alert.alert(
      t('home.deleteTitle', { name: group.name }),
      t('home.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(group.id);
            setGroups((prev) => prev.filter((g) => g.id !== group.id));
          },
        },
      ],
    );
  };

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
      {tab === 'active' && (
        <Pressable style={[styles.planWithKipCard, cardShadow]} onPress={() => navigation.navigate('TripWizard')}>
          <LinearGradient colors={['#FF6B5B', '#7FA68C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planWithKipGradient}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={styles.planWithKipBadgeRow}>
                <Ionicons name="sparkles" size={9} color="rgba(255,255,255,0.9)" />
                <Text style={styles.planWithKipBadgeText}>WIZARD</Text>
              </View>
              <Text style={styles.planWithKipTitle}>Plan with Kip</Text>
              <Text style={styles.planWithKipSub}>{t('home.planWithKipSub')}</Text>
            </View>
            <View style={styles.planWithKipImageWrapper}>
              <Image source={require('../assets/Kip_jog.png')} style={styles.planWithKipImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </Pressable>
      )}
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
            <GroupCard
              group={item}
              index={index}
              isArchived={tab === 'archived'}
              onConclude={() => handleConclude(item)}
              onDelete={() => handleDelete(item)}
            />
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
