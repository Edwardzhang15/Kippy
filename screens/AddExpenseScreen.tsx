import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { HomeStackParamList } from '../navigation/types';
import {
  getGroupDetails, getSubgroups, addExpense, getExpense, updateExpense, deleteExpense,
  GroupDetails, MemberWithBalance, SubgroupWithMembers,
} from '../db';
import { CATEGORIES, Category } from '../categories';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { getAvatarColor, getInitials, getCurrencySymbol } from '../utils';

type Props = NativeStackScreenProps<HomeStackParamList, 'AddExpense'>;

const EXPENSE_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];

const GRID_COLS = 3;
const GRID_GAP  = 8;
const H_PAD     = 20;
const ITEM_W    = (Dimensions.get('window').width - H_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function CategoryButton({
  cat,
  selected,
  onPress,
}: {
  cat: Category;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.categoryItem,
        selected && styles.categoryItemSelected,
        pressed && { opacity: 0.75 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.categoryIconBg, { backgroundColor: selected ? cat.bg : colors.border }]}>
        <Ionicons
          name={cat.icon}
          size={20}
          color={selected ? cat.color : colors.tabInactive}
        />
      </View>
      <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
        {t(`categories.${cat.id}`, cat.label)}
      </Text>
    </Pressable>
  );
}

function MemberAvatarButton({
  member,
  avatarIndex,
  selected,
  showCheck,
  onPress,
}: {
  member: MemberWithBalance;
  avatarIndex: number;
  selected: boolean;
  showCheck: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.memberOption, pressed && { opacity: 0.75 }]}
      onPress={onPress}
    >
      <View style={styles.avatarWrapper}>
        <View
          style={[
            styles.memberAvatar,
            { backgroundColor: selected ? getAvatarColor(avatarIndex) : colors.border },
            selected && styles.memberAvatarSelected,
          ]}
        >
          <Text style={styles.memberInitials}>{getInitials(member.name)}</Text>
        </View>
        {showCheck && selected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[styles.memberName, selected && styles.memberNameSelected]}>
        {member.name}
      </Text>
    </Pressable>
  );
}

export default function AddExpenseScreen({ route, navigation }: Props) {
  const { t }                                           = useTranslation();
  const { colors }                                      = useTheme();
  const styles                                          = makeStyles(colors);
  const isEditMode                                       = !!route.params.expenseId;
  const [group, setGroup]                               = useState<GroupDetails | null>(null);
  const [subgroups, setSubgroups]                       = useState<SubgroupWithMembers[]>([]);
  const [loading, setLoading]                           = useState(true);
  const [amount, setAmount]                             = useState('');
  const [category, setCategory]                         = useState('food');
  const [customCategoryText, setCustomCategoryText]     = useState('');
  const [paidBy, setPaidBy]                             = useState<number | null>(null);
  const [splitAmong, setSplitAmong]                     = useState<number[]>([]);
  const [activeSgId, setActiveSgId]                     = useState<number | null>(null);
  const [date, setDate]                                 = useState(new Date());
  const [showPicker, setShowPicker]                     = useState(false);
  const [expenseCurrency, setExpenseCurrency]           = useState('');
  const [saving, setSaving]                             = useState(false);
  const [deleting, setDeleting]                         = useState(false);
  const [receiptUri, setReceiptUri]                     = useState<string | null>(null);
  const [showPhotoSheet, setShowPhotoSheet]             = useState(false);
  const [showAmountPrompt, setShowAmountPrompt]         = useState(!isEditMode);
  const promptOpacity                                    = useRef(new Animated.Value(1)).current;
  const bounceAnim                                       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showAmountPrompt) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -7, duration: 420, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0,  duration: 420, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showAmountPrompt]);

  const dismissAmountPrompt = () => {
    if (!showAmountPrompt) return;
    Animated.timing(promptOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setShowAmountPrompt(false),
    );
  };

  useEffect(() => {
    Promise.all([
      getGroupDetails(route.params.groupId),
      getSubgroups(route.params.groupId),
      route.params.expenseId ? getExpense(route.params.expenseId) : Promise.resolve(null),
    ]).then(([data, sgData, expenseData]) => {
      if (data) {
        setGroup(data);
        if (expenseData) {
          setAmount(expenseData.amount.toFixed(2));
          setCategory(expenseData.category);
          setCustomCategoryText(expenseData.custom_category ?? '');
          setPaidBy(expenseData.paid_by);
          setSplitAmong(expenseData.splitMemberIds);
          const [y, m, d] = expenseData.date.split('-').map(Number);
          setDate(new Date(y, m - 1, d));
          setReceiptUri(expenseData.receipt_photo_uri);
          setExpenseCurrency(expenseData.currency);
        } else {
          setPaidBy(data.members[0]?.id ?? null);
          setSplitAmong(data.members.map((m) => m.id));
          setExpenseCurrency(data.currency);
        }
      }
      setSubgroups(sgData);
      setLoading(false);
    });
  }, []);

  const toggleSplit = (memberId: number) => {
    setActiveSgId(null);
    setSplitAmong((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const applySubgroup = (sg: SubgroupWithMembers) => {
    setActiveSgId(sg.id);
    setSplitAmong(sg.members.map((m) => m.id));
  };

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(selected);
  };

  const pickFromLibrary = async () => {
    setShowPhotoSheet(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setShowPhotoSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleReceiptPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('addExpense.takePhoto'), t('addExpense.chooseFromLibrary'), t('common.cancel')],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) takePhoto();
          else if (index === 1) pickFromLibrary();
        },
      );
    } else {
      setShowPhotoSheet(true);
    }
  };

  const handleSave = async () => {
    if (!group || !paidBy || saving || deleting) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0 || splitAmong.length === 0) return;
    setSaving(true);
    try {
      if (isEditMode && route.params.expenseId) {
        await updateExpense(route.params.expenseId, {
          amount: parsed,
          currency: expenseCurrency,
          category,
          paidBy,
          date: date.toISOString().split('T')[0],
          splitMemberIds: splitAmong,
          customCategory: category === 'other' ? customCategoryText.trim() : undefined,
          receiptPhotoUri: receiptUri,
        });
      } else {
        await addExpense(
          group.id, parsed, expenseCurrency, category, paidBy,
          date.toISOString().split('T')[0], splitAmong,
          undefined,
          category === 'other' ? customCategoryText.trim() : undefined,
          receiptUri ?? undefined,
        );
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!route.params.expenseId) return;
    const expenseId = route.params.expenseId;
    Alert.alert(
      t('addExpense.deleteTitle'),
      t('addExpense.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('addExpense.deleteExpense'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(expenseId);
              navigation.goBack();
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const formattedDate = date.toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  const canSave =
    !loading &&
    !saving &&
    !deleting &&
    parseFloat(amount) > 0 &&
    paidBy !== null &&
    splitAmong.length > 0 &&
    (category !== 'other' || customCategoryText.trim().length > 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.coral} />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 24, color: colors.textSecondary }}>{t('common.groupNotFound')}</Text>
      </SafeAreaView>
    );
  }

  const saveLabel = saving
    ? t('addExpense.saving')
    : isEditMode
      ? t('addExpense.updateExpense')
      : t('addExpense.save');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditMode ? t('addExpense.editTitle') : t('addExpense.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>{getCurrencySymbol(expenseCurrency || group.currency)}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder={expenseCurrency === 'JPY' ? '0' : '0.00'}
              placeholderTextColor={colors.border}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              onFocus={dismissAmountPrompt}
            />
            <Text style={[styles.currencySymbol, { opacity: 0 }]} aria-hidden>{getCurrencySymbol(expenseCurrency || group.currency)}</Text>
          </View>

          {showAmountPrompt && (
            <Animated.View style={[styles.amountPrompt, { opacity: promptOpacity }]}>
              <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
                <Ionicons name="arrow-up-circle" size={22} color={colors.coral} />
              </Animated.View>
              <Text style={styles.amountPromptText}>{t('addExpense.tapToEnterAmount')}</Text>
            </Animated.View>
          )}

          <SectionLabel title={t('addExpense.currency')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.currencyScroll}
            contentContainerStyle={styles.currencyScrollContent}
          >
            {EXPENSE_CURRENCIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.currencyChip, expenseCurrency === c && styles.currencyChipSelected]}
                onPress={() => setExpenseCurrency(c)}
              >
                <Text style={[styles.currencyChipText, expenseCurrency === c && styles.currencyChipTextSelected]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionLabel title={t('addExpense.category')} />
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat.id}
                cat={cat}
                selected={category === cat.id}
                onPress={() => setCategory(cat.id)}
              />
            ))}
          </View>

          {category === 'other' && (
            <>
              <SectionLabel title={t('addExpense.describeIt')} />
              <View style={[styles.customCatCard, cardShadow]}>
                <TextInput
                  style={styles.customCatInput}
                  placeholder={t('addExpense.describePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={customCategoryText}
                  onChangeText={setCustomCategoryText}
                  returnKeyType="done"
                />
              </View>
            </>
          )}

          <SectionLabel title={t('addExpense.paidBy')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
            {group.members.map((member, i) => (
              <MemberAvatarButton
                key={member.id}
                member={member}
                avatarIndex={i}
                selected={paidBy === member.id}
                showCheck={false}
                onPress={() => setPaidBy(member.id)}
              />
            ))}
          </ScrollView>

          <SectionLabel title={t('addExpense.splitAmong')} />
          {subgroups.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sgChipScroll}
              contentContainerStyle={styles.sgChipContent}
            >
              {subgroups.map((sg) => {
                const isActive = activeSgId === sg.id;
                return (
                  <Pressable
                    key={sg.id}
                    style={({ pressed }) => [
                      styles.sgChip,
                      isActive && styles.sgChipActive,
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => applySubgroup(sg)}
                  >
                    <Text style={[styles.sgChipText, isActive && styles.sgChipTextActive]}>
                      {sg.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
            {group.members.map((member, i) => (
              <MemberAvatarButton
                key={member.id}
                member={member}
                avatarIndex={i}
                selected={splitAmong.includes(member.id)}
                showCheck
                onPress={() => toggleSplit(member.id)}
              />
            ))}
          </ScrollView>

          <SectionLabel title={t('addExpense.date')} />
          <Pressable style={[styles.dateRow, cardShadow]} onPress={() => setShowPicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tabInactive} />
          </Pressable>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
          {Platform.OS === 'ios' && showPicker && (
            <Pressable style={styles.pickerDone} onPress={() => setShowPicker(false)}>
              <Text style={styles.pickerDoneText}>{t('common.done')}</Text>
            </Pressable>
          )}

          <SectionLabel title={t('addExpense.receipt')} />
          {receiptUri ? (
            <View style={styles.receiptRow}>
              <Image source={{ uri: receiptUri }} style={styles.receiptThumb} resizeMode="cover" />
              <View style={styles.receiptActions}>
                <Pressable
                  style={({ pressed }) => [styles.receiptActionBtn, pressed && { opacity: 0.7 }]}
                  onPress={handleReceiptPress}
                >
                  <Ionicons name="camera-outline" size={16} color={colors.coral} />
                  <Text style={styles.receiptActionText}>{t('addExpense.replacePhoto')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.receiptActionBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setReceiptUri(null)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.receiptActionText, { color: colors.textSecondary }]}>
                    {t('addExpense.removePhoto')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={[styles.addReceiptBtn, cardShadow]} onPress={handleReceiptPress}>
              <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.addReceiptText}>{t('addExpense.addReceipt')}</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.saveContainer}>
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>{saveLabel}</Text>
          </Pressable>

          {isEditMode && (
            <Pressable
              style={[styles.deleteButton, deleting && { opacity: 0.5 }]}
              onPress={handleDelete}
              disabled={deleting || saving}
            >
              <Ionicons name="trash-outline" size={16} color={colors.coral} />
              <Text style={styles.deleteText}>
                {deleting ? t('addExpense.deleting') : t('addExpense.deleteExpense')}
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showPhotoSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoSheet(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowPhotoSheet(false)}>
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>{t('addExpense.addReceipt')}</Text>
            <Pressable style={styles.sheetOption} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.sheetOptionText}>{t('addExpense.takePhoto')}</Text>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable style={styles.sheetOption} onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.sheetOptionText}>{t('addExpense.chooseFromLibrary')}</Text>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable style={[styles.sheetOption, styles.sheetCancel]} onPress={() => setShowPhotoSheet(false)}>
              <Text style={styles.sheetCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
  },
  scroll: {
    paddingHorizontal: H_PAD,
    paddingBottom: 24,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
    gap: 4,
  },
  amountPrompt: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 6,
    marginBottom: 20,
  },
  amountPromptText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.coral,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 64,
    fontWeight: '700',
    color: c.textPrimary,
    minWidth: 140,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 24,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  categoryItem: {
    width: ITEM_W,
    backgroundColor: c.card,
    borderRadius: radii.button,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    borderColor: c.coral,
  },
  categoryIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: c.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: c.coral,
    fontWeight: '700',
  },

  customCatCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  customCatInput: {
    fontSize: fontSizes.body,
    color: c.textPrimary,
    paddingVertical: 14,
  },

  memberScroll: {
    flexGrow: 0,
  },
  memberOption: {
    alignItems: 'center',
    marginRight: 18,
    gap: 6,
  },
  avatarWrapper: {
    position: 'relative',
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  memberAvatarSelected: {
    borderColor: c.coral,
  },
  memberInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  memberName: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    fontWeight: '500',
  },
  memberNameSelected: {
    color: c.textPrimary,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: c.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.background,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
  },
  pickerDone: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pickerDoneText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.coral,
  },

  addReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    borderStyle: 'dashed',
  },
  addReceiptText: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textSecondary,
  },
  receiptRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  receiptThumb: {
    width: 80,
    height: 105,
    borderRadius: radii.card,
    backgroundColor: c.border,
    flexShrink: 0,
  },
  receiptActions: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingTop: 4,
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptActionText: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.coral,
  },

  saveContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    paddingTop: 12,
    backgroundColor: c.background,
    gap: 4,
  },
  saveButton: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.coral,
  },

  sgChipScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  sgChipContent: {
    gap: 8,
  },
  sgChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  sgChipActive: {
    borderColor: c.coral,
    backgroundColor: '#FFF0EE',
  },
  sgChipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
  },
  sgChipTextActive: {
    color: c.coral,
  },

  currencyScroll: {
    flexGrow: 0,
  },
  currencyScrollContent: {
    gap: 8,
  },
  currencyChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currencyChipSelected: {
    borderColor: c.coral,
  },
  currencyChipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  currencyChipTextSelected: {
    color: c.coral,
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: c.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  sheetTitle: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    paddingVertical: 12,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sheetOptionText: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
  },
  sheetCancel: {
    justifyContent: 'center',
    marginTop: 4,
  },
  sheetCancelText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.coral,
    textAlign: 'center',
    flex: 1,
  },
});
