import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  LayoutAnimation,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { PlanStackParamList } from '../navigation/types';
import { getGroupDetails, addMember, activatePlanTrip, getTripStops, GroupDetails, TripStop } from '../db';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<PlanStackParamList, 'PlanDetail'>;

function formatPlanDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0EE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: c.coral,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  screenTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  destinationText: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    fontWeight: '500',
  },
  photoHeader: {
    height: 220,
    overflow: 'hidden',
  },
  photoBackBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitleArea: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    gap: 4,
  },
  planBadgePhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 2,
  },
  planBadgeTextPhoto: {
    fontSize: 10,
    fontWeight: '700',
    color: c.card,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  photoTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '800',
    color: c.card,
    lineHeight: 34,
  },
  photoDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoDestText: {
    fontSize: fontSizes.body,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  detailIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textPrimary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 16,
  },
  membersCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberInput: {
    flex: 1,
    fontSize: fontSizes.body,
    color: c.textPrimary,
    paddingVertical: 14,
  },
  memberDivider: {
    height: 1,
    backgroundColor: c.border,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginHorizontal: 20,
    alignSelf: 'flex-start',
  },
  addMemberText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.coral,
  },
  // Kip's Picks button
  kipPicksBtn: {
    borderRadius: radii.card,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginTop: 24,
  },
  kipPicksGradient: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 20,
    paddingVertical: 18,
    minHeight: 96,
  },
  kipBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  kipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.8,
  },
  kipPicksTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
  },
  kipPicksSub: {
    fontSize: fontSizes.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  kipPicksImage: {
    width: 88,
    height: 88,
    alignSelf: 'flex-end',
  },
  planningToolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 16,
  },
  planningToolsTitle: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
  },

  itineraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 0,
  },
  packingBtn: {
    marginTop: 12,
    marginBottom: 0,
  },
  budgetBtn: {
    marginTop: 12,
    marginBottom: 0,
  },
  itineraryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  packingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  budgetIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  exploreBtn: {
    marginTop: 12,
    marginBottom: 0,
  },
  exploreIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F4F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itineraryBtnTitle: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 2,
  },
  itineraryBtnSub: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.sage,
    borderRadius: radii.button,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 32,
    shadowColor: c.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  activateBtnDisabled: {
    opacity: 0.45,
  },
  activateBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.card,
    letterSpacing: 0.3,
  },
  stopsSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  stopsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  stopsLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stopsChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stopChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  stopChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textPrimary,
  },
  stopsArrow: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    marginHorizontal: 6,
  },
});

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconBg}>
        <Ionicons name={icon} size={16} color={colors.coral} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function PlanDetailScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [group, setGroup]         = useState<GroupDetails | null>(null);
  const [loading, setLoading]     = useState(true);
  const [memberNames, setMemberNames] = useState<string[]>(['', '']);
  const [activating, setActivating]   = useState(false);
  const [stops, setStops]             = useState<TripStop[]>([]);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const toggleTools = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setToolsExpanded(prev => !prev);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getGroupDetails(route.params.groupId),
        getTripStops(route.params.groupId),
      ]).then(([data, stopsData]) => {
        if (!active) return;
        setGroup(data);
        setStops(stopsData);
        if (data && data.members.length > 0) {
          setMemberNames(data.members.map((m) => m.name));
        }
        setLoading(false);
      });
      return () => { active = false; };
    }, [route.params.groupId]),
  );

  const addMemberField = () => setMemberNames((prev) => [...prev, '']);
  const updateMember   = (i: number, v: string) =>
    setMemberNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  const removeMember   = (i: number) =>
    setMemberNames((prev) => prev.filter((_, idx) => idx !== i));

  const validNames = memberNames.filter((n) => n.trim().length > 0);
  const canActivate = validNames.length > 0 && !activating;

  const handleActivate = () => {
    if (!group) return;
    if (validNames.length === 0) {
      Alert.alert(t('planDetail.addMembersAlert'), t('planDetail.addMembersMsg'));
      return;
    }
    Alert.alert(
      t('planDetail.activateTitle'),
      t('planDetail.activateMsg', { count: validNames.length, name: group.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('planDetail.activate'),
          onPress: async () => {
            setActivating(true);
            try {
              const existingNames = new Set(group.members.map((m) => m.name));
              for (const name of validNames) {
                if (!existingNames.has(name)) {
                  await addMember(group.id, name);
                }
              }
              await activatePlanTrip(group.id);
              navigation.navigate('Home', {
                screen: 'GroupDetail',
                params: { groupId: group.id },
                initial: false,
              });
            } finally {
              setActivating(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hasPhoto   = Boolean(group.destination_photo_url);
  const startFmt   = formatPlanDate(group.planned_start_date);
  const endFmt     = formatPlanDate(group.planned_end_date);
  const dateRange  = startFmt && endFmt
    ? `${startFmt} – ${endFmt}`
    : startFmt ? startFmt
    : endFmt   ? endFmt
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {hasPhoto ? (
          <View style={styles.photoHeader}>
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
            <Pressable style={styles.photoBackBtn} onPress={() => navigation.goBack()} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.card} />
            </Pressable>
            <View style={styles.photoTitleArea}>
              <View style={styles.planBadgePhoto}>
                <Ionicons name="map-outline" size={11} color={colors.card} />
                <Text style={styles.planBadgeTextPhoto}>{t('planDetail.planningBadge')}</Text>
              </View>
              <Text style={styles.photoTitle} numberOfLines={2}>{group.name}</Text>
              {group.destination ? (
                <View style={styles.photoDestRow}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.80)" />
                  <Text style={styles.photoDestText}>{group.destination}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.navRow}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.planBadge}>
              <Ionicons name="map-outline" size={11} color={colors.coral} />
              <Text style={styles.planBadgeText}>{t('planDetail.planningBadge')}</Text>
            </View>
            <Text style={styles.screenTitle}>{group.name}</Text>
            {group.destination ? (
              <View style={styles.destinationRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.destinationText}>{group.destination}</Text>
              </View>
            ) : null}
          </>
        )}

        {(dateRange || group.budget_per_person != null) && (
          <>
            <Text style={styles.sectionTitle}>{t('planDetail.tripDetails')}</Text>
            <View style={[styles.detailsCard, cardShadow]}>
              {dateRange && (
                <DetailRow
                  icon="calendar-outline"
                  label={t('planDetail.plannedDates')}
                  value={dateRange}
                />
              )}
              {dateRange && group.budget_per_person != null && (
                <View style={styles.detailDivider} />
              )}
              {group.budget_per_person != null && (
                <DetailRow
                  icon="wallet-outline"
                  label={t('planDetail.budgetPerPerson')}
                  value={`$${group.budget_per_person.toFixed(2)} ${group.currency}`}
                />
              )}
            </View>
          </>
        )}

        {stops.length > 0 && (
          <View style={styles.stopsSection}>
            <View style={styles.stopsLabelRow}>
              <Ionicons name="map-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.stopsLabel}>{t('planDetail.stops')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stopsChipRow}
            >
              {stops.map((stop, i) => (
                <View key={stop.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {i > 0 && <Text style={styles.stopsArrow}>{'→'}</Text>}
                  <View style={styles.stopChip}>
                    <Text style={styles.stopChipText}>{stop.stop_name}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Pressable
          style={[styles.kipPicksBtn, cardShadow]}
          onPress={() =>
            navigation.navigate('Explore', {
              groupId: group.id,
              destination: group.destination ?? group.name,
            })
          }
        >
          <LinearGradient
            colors={['#FF6B5B', '#7FA68C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.kipPicksGradient}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={styles.kipBadgeRow}>
                <Ionicons name="sparkles" size={11} color="rgba(255,255,255,0.9)" />
                <Text style={styles.kipBadgeText}>KIP'S PICKS</Text>
              </View>
              <Text style={styles.kipPicksTitle}>{t('planDetail.explore')}</Text>
              <Text style={styles.kipPicksSub}>{t('planDetail.exploreSub')}</Text>
            </View>
            <Image
              source={require('../assets/Kippy_Trans.png')}
              style={styles.kipPicksImage}
              resizeMode="contain"
            />
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.planningToolsHeader} onPress={toggleTools}>
          <Text style={styles.planningToolsTitle}>{t('planDetail.planningTools')}</Text>
          <Ionicons
            name={toolsExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>

        {toolsExpanded && (
          <>
            <Pressable
              style={[styles.itineraryBtn, { marginTop: 12 }, cardShadow]}
              onPress={() =>
                navigation.navigate('Itinerary', {
                  groupId: group.id,
                  totalDays: (() => {
                    if (!group.planned_start_date || !group.planned_end_date) return 7;
                    const diff =
                      (new Date(group.planned_end_date).getTime() -
                        new Date(group.planned_start_date).getTime()) /
                      (1000 * 60 * 60 * 24);
                    return Math.max(1, Math.ceil(diff));
                  })(),
                })
              }
            >
              <View style={styles.itineraryIconBg}>
                <Ionicons name="calendar-outline" size={20} color={colors.coral} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itineraryBtnTitle}>{t('planDetail.itineraryTitle')}</Text>
                <Text style={styles.itineraryBtnSub}>{t('planDetail.itinerarySub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
            </Pressable>

            <Pressable
              style={[styles.itineraryBtn, styles.packingBtn, cardShadow]}
              onPress={() => navigation.navigate('PackingList', { groupId: group.id })}
            >
              <View style={styles.packingIconBg}>
                <Ionicons name="bag-handle-outline" size={20} color={colors.sage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itineraryBtnTitle}>{t('planDetail.packingListTitle')}</Text>
                <Text style={styles.itineraryBtnSub}>{t('planDetail.packingListSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
            </Pressable>

            <Pressable
              style={[styles.itineraryBtn, styles.budgetBtn, cardShadow]}
              onPress={() => navigation.navigate('BudgetPlan', { groupId: group.id })}
            >
              <View style={styles.budgetIconBg}>
                <Ionicons name="wallet-outline" size={20} color="#6A9BD8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itineraryBtnTitle}>{t('planDetail.budgetPlanTitle')}</Text>
                <Text style={styles.itineraryBtnSub}>{t('planDetail.budgetPlanSub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
            </Pressable>
          </>
        )}

        <Text style={styles.sectionTitle}>{t('planDetail.members')}</Text>
        <View style={[styles.membersCard, cardShadow]}>
          {memberNames.map((name, index) => (
            <View key={index}>
              {index > 0 && <View style={styles.memberDivider} />}
              <View style={styles.memberRow}>
                <TextInput
                  style={styles.memberInput}
                  placeholder={t('planDetail.memberPlaceholder', { number: index + 1 })}
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={(v) => updateMember(index, v)}
                  returnKeyType="done"
                />
                {memberNames.length > 1 && (
                  <Pressable onPress={() => removeMember(index)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.addMemberBtn} onPress={addMemberField}>
          <Ionicons name="add-circle-outline" size={18} color={colors.coral} />
          <Text style={styles.addMemberText}>{t('planDetail.addMember')}</Text>
        </Pressable>

        <Pressable
          style={[styles.activateBtn, !canActivate && styles.activateBtnDisabled]}
          onPress={handleActivate}
          disabled={!canActivate}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.card} />
          <Text style={styles.activateBtnText}>
            {activating ? t('planDetail.activating') : t('planDetail.activateTrip')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
