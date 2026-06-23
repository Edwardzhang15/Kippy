import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { PlanStackParamList } from '../navigation/types';
import { createPlanTrip, addTripStop } from '../db';
import { fetchPlaces, type PlaceResult } from '../placesApi';
import { type ColorPalette, fontSizes, radii, cardShadow } from '../theme';
import { useTheme } from '../context/ThemeContext';
import {
  VIBES,
  VIBE_TIPS,
  TRANSPORT_OPTIONS,
  MONTH_SHORT,
  getPacingAdvice,
  type Vibe,
} from '../data/wizardData';

type Props = NativeStackScreenProps<PlanStackParamList, 'TripWizard'>;

// ─── Types ───────────────────────────────────────────────────────────────────

type Stage = 'basics' | 'vibe_pick' | 'pace' | 'results';

type WizardAnswers = {
  peopleCount: number;
  transport: string | null;
  months: number[];
  days: number;
  budgetPerPerson: string;
  destination: string;
  stops: string[];
  selectedVibe: Vibe | null;
  pace: 'packed' | 'balanced' | 'relaxed' | null;
};

type GoTo = (stage: Stage, updates?: Partial<WizardAnswers>) => void;

const INITIAL_ANSWERS: WizardAnswers = {
  peopleCount: 2,
  transport: null,
  months: [],
  days: 7,
  budgetPerPerson: '',
  destination: '',
  stops: [],
  selectedVibe: null,
  pace: null,
};

const UNSPLASH_KEY = '_dJ9KWj8_6gx-it3O-USLvSCHVRLH39n2okh6S3Onlo';
const STOP_CITY_EXAMPLES = ['Tokyo', 'Kyoto', 'Osaka', 'Rome', 'Paris', 'Barcelona'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProgressStep(stage: Stage): number {
  if (stage === 'basics')   return 1;
  if (stage === 'vibe_pick') return 2;
  if (stage === 'pace')      return 3;
  return 4; // results
}

function calcDates(months: number[], days: number): { start: string; end: string } | null {
  if (months.length === 0 || days < 1) return null;
  const month = Math.min(...months);
  const now   = new Date();
  const year  = month <= now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
  const s     = new Date(year, month - 1, 1);
  const e     = new Date(year, month - 1, days);
  const fmt   = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(s), end: fmt(e) };
}

async function fetchPhoto(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_KEY}`,
      { headers: { 'Accept-Version': 'v1' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.results?.[0]?.urls?.regular as string) ?? null;
  } catch {
    return null;
  }
}

function searchURL(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// ─── Styles factory ──────────────────────────────────────────────────────────

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.border,
  },
  dotDone: {
    backgroundColor: c.coral,
    opacity: 0.45,
  },
  dotActive: {
    width: 20,
    backgroundColor: c.coral,
    opacity: 1,
  },

  stageContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  stageTitle: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '800',
    color: c.textPrimary,
    marginBottom: 6,
    lineHeight: 36,
  },
  stageSubtitle: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    marginBottom: 24,
    lineHeight: 21,
  },
  optionStack: {
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionTitle: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    lineHeight: 17,
  },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: '700',
    color: c.textPrimary,
  },
  stepperSuffix: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textSecondary,
  },

  formCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textSecondary,
  },
  budgetInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    paddingVertical: 4,
  },
  destInput: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
    paddingVertical: 6,
  },

  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.button,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  chipSelected: {
    backgroundColor: '#FFF0EE',
    borderColor: c.coral,
  },
  chipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  chipTextSelected: {
    color: c.coral,
  },

  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  monthChip: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: radii.button,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
  },
  monthChipSelected: {
    backgroundColor: '#FFF0EE',
    borderColor: c.coral,
  },
  monthChipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.textSecondary,
  },
  monthChipTextSelected: {
    color: c.coral,
  },

  continueBtn: {
    backgroundColor: c.coral,
    borderRadius: radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  resultsHeader: {
    marginBottom: 28,
  },
  resultsDestination: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '800',
    color: c.textPrimary,
    marginBottom: 10,
    lineHeight: 36,
  },
  resultsMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resultsMetaText: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    fontWeight: '500',
  },
  resultsSectionTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },

  pacingCard: {
    backgroundColor: '#FFF0EE',
    borderRadius: radii.card,
    padding: 18,
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: c.coral,
  },
  pacingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pacingBadge: {
    backgroundColor: c.coral,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pacingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  pacingHeadline: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: c.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  pacingBody: {
    fontSize: fontSizes.body,
    color: c.textPrimary,
    lineHeight: 22,
  },
  pacingCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(255,107,91,0.10)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pacingCalloutText: {
    fontSize: fontSizes.caption,
    color: c.textPrimary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },

  tipsCard: {
    backgroundColor: c.card,
    borderRadius: radii.card,
    marginBottom: 28,
    overflow: 'hidden',
    ...cardShadow as object,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  tipRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  tipIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  tipText: {
    fontSize: fontSizes.caption,
    color: c.textPrimary,
    lineHeight: 18,
    flex: 1,
  },

  linksRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF0EE',
    borderRadius: radii.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkChipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.coral,
  },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.sage,
    borderRadius: radii.button,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: c.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  createBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Explore preview
  previewLoading: {
    fontSize: fontSizes.body,
    color: c.textSecondary,
    marginBottom: 28,
  },
  previewCatBlock: {
    marginBottom: 16,
  },
  previewCatLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  previewExploreHint: {
    fontSize: fontSizes.caption,
    color: c.textSecondary,
    marginBottom: 28,
    marginTop: 4,
  },
  wzCard: {
    width: 160,
    backgroundColor: c.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  wzPhoto: {
    width: 160,
    height: 90,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
  },
  wzPhotoPlaceholder: {
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wzCardBody: {
    padding: 8,
    gap: 3,
  },
  wzName: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: c.textPrimary,
    lineHeight: 15,
  },
  wzRating: {
    fontSize: 10,
    color: c.textSecondary,
    fontWeight: '600',
  },
});

// ─── Shared UI ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  const sh = makeStyles(colors);
  return <Text style={sh.sectionLabel}>{children}</Text>;
}

function OptionCard({
  icon,
  title,
  subtitle,
  onPress,
  iconColor,
  iconBg = '#FFF0EE',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
}) {
  const { colors }        = useTheme();
  const sh                = makeStyles(colors);
  const resolvedIconColor = iconColor ?? colors.coral;
  return (
    <Pressable
      style={({ pressed }) => [sh.optionCard, cardShadow, pressed && { opacity: 0.82 }]}
      onPress={onPress}
    >
      <View style={[sh.optionIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={resolvedIconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sh.optionTitle}>{title}</Text>
        <Text style={sh.optionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
    </Pressable>
  );
}

function Stepper({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (n: number) => void;
}) {
  const { colors } = useTheme();
  const sh = makeStyles(colors);
  return (
    <View style={sh.stepperRow}>
      <Pressable
        style={[sh.stepperBtn, value <= min && sh.stepperBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        hitSlop={8}
      >
        <Ionicons name="remove" size={18} color={value <= min ? colors.border : colors.textPrimary} />
      </Pressable>
      <Text style={sh.stepperValue}>
        {value} <Text style={sh.stepperSuffix}>{suffix}</Text>
      </Text>
      <Pressable
        style={[sh.stepperBtn, value >= max && sh.stepperBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        hitSlop={8}
      >
        <Ionicons name="add" size={18} color={value >= max ? colors.border : colors.textPrimary} />
      </Pressable>
    </View>
  );
}

function WizardContainer({
  onBack,
  onClose,
  progressStep,
  children,
}: {
  onBack: () => void;
  onClose: () => void;
  progressStep: number;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const sh = makeStyles(colors);
  return (
    <SafeAreaView style={sh.safe}>
      <View style={sh.navRow}>
        <Pressable onPress={onBack} hitSlop={12} style={sh.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={sh.progressRow}>
          {[1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                sh.dot,
                step < progressStep  && sh.dotDone,
                step === progressStep && sh.dotActive,
              ]}
            />
          ))}
        </View>

        <Pressable onPress={onClose} hitSlop={12} style={sh.navBtn}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      {children}
    </SafeAreaView>
  );
}

function ContinueButton({
  label,
  onPress,
  disabled = false,
}: {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sh = makeStyles(colors);
  return (
    <Pressable
      style={[sh.continueBtn, disabled && sh.continueBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={sh.continueBtnText}>{label ?? t('wizard.continue')}</Text>
    </Pressable>
  );
}

// ─── Stage 1: Basics ─────────────────────────────────────────────────────────

function S2Basics({
  answers,
  updateAnswers,
  goTo,
}: {
  answers: WizardAnswers;
  updateAnswers: (u: Partial<WizardAnswers>) => void;
  goTo: GoTo;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sh = makeStyles(colors);

  const toggleMonth = (m: number) => {
    const next = answers.months.includes(m)
      ? answers.months.filter((x) => x !== m)
      : [...answers.months, m];
    updateAnswers({ months: next });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={sh.stageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={sh.stageTitle}>{t('wizard.basics.title')}</Text>

        <SectionLabel>{t('wizard.basics.destination')}</SectionLabel>
        <View style={[sh.formCard, cardShadow, sh.inputCard]}>
          <Ionicons name="location-outline" size={18} color={colors.coral} />
          <TextInput
            style={sh.destInput}
            placeholder={t('wizard.basics.destinationPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={answers.destination}
            onChangeText={(v) => updateAnswers({ destination: v })}
            returnKeyType="next"
            autoCapitalize="words"
          />
        </View>

        <SectionLabel>{t('wizard.basics.stops')}</SectionLabel>
        {answers.stops.length > 0 && (
          <View style={[sh.formCard, cardShadow]}>
            {answers.stops.map((stop, i) => (
              <View key={i}>
                {i > 0 && <View style={{ height: 1, backgroundColor: colors.border }} />}
                <View style={[sh.inputCard, { paddingVertical: 4 }]}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <TextInput
                    style={[sh.destInput, { flex: 1 }]}
                    placeholder={t('wizard.basics.stopPlaceholder', { city: STOP_CITY_EXAMPLES[i % STOP_CITY_EXAMPLES.length] })}
                    placeholderTextColor={colors.textSecondary}
                    value={stop}
                    onChangeText={(v) => {
                      const next = answers.stops.map((s, idx) => idx === i ? v : s);
                      updateAnswers({ stops: next });
                    }}
                    returnKeyType="done"
                    autoCapitalize="words"
                  />
                  <Pressable
                    hitSlop={8}
                    onPress={() => updateAnswers({ stops: answers.stops.filter((_, idx) => idx !== i) })}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}
          onPress={() => updateAnswers({ stops: [...answers.stops, ''] })}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.coral} />
          <Text style={{ fontSize: fontSizes.caption, fontWeight: '600', color: colors.coral }}>
            {t('wizard.basics.addStop')}
          </Text>
        </Pressable>

        <SectionLabel>{t('wizard.basics.people')}</SectionLabel>
        <View style={[sh.formCard, cardShadow]}>
          <Stepper
            value={answers.peopleCount}
            min={1}
            max={30}
            suffix={t('wizard.basics.personSuffix', { count: answers.peopleCount })}
            onChange={(n) => updateAnswers({ peopleCount: n })}
          />
        </View>

        <SectionLabel>{t('wizard.basics.transport')}</SectionLabel>
        <View style={sh.chipRow}>
          {TRANSPORT_OPTIONS.map((tr) => {
            const sel = answers.transport === tr;
            return (
              <Pressable
                key={tr}
                style={[sh.chip, sel && sh.chipSelected]}
                onPress={() => updateAnswers({ transport: sel ? null : tr })}
              >
                <Text style={[sh.chipText, sel && sh.chipTextSelected]}>{t(`wizard.basics.transportOptions.${tr}`, tr)}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>{t('wizard.basics.months')}</SectionLabel>
        <View style={sh.monthGrid}>
          {MONTH_SHORT.map((name, i) => {
            const m   = i + 1;
            const sel = answers.months.includes(m);
            return (
              <Pressable
                key={m}
                style={[sh.monthChip, sel && sh.monthChipSelected]}
                onPress={() => toggleMonth(m)}
              >
                <Text style={[sh.monthChipText, sel && sh.monthChipTextSelected]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>{t('wizard.basics.days')}</SectionLabel>
        <View style={[sh.formCard, cardShadow]}>
          <Stepper
            value={answers.days}
            min={1}
            max={90}
            suffix={t('wizard.basics.daySuffix', { count: answers.days })}
            onChange={(n) => updateAnswers({ days: n })}
          />
        </View>

        <SectionLabel>{t('wizard.basics.budget')}</SectionLabel>
        <View style={[sh.formCard, cardShadow, sh.inputCard]}>
          <Text style={sh.currencyPrefix}>$</Text>
          <TextInput
            style={sh.budgetInput}
            placeholder={t('wizard.basics.budgetPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={answers.budgetPerPerson}
            onChangeText={(v) => updateAnswers({ budgetPerPerson: v })}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <ContinueButton
          onPress={() => goTo('vibe_pick')}
          disabled={answers.destination.trim().length === 0}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Stage 2: Vibe pick ──────────────────────────────────────────────────────

function S3VibePick({ goTo }: { goTo: GoTo }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sh = makeStyles(colors);
  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <Text style={sh.stageTitle}>{t('wizard.vibe.title')}</Text>
      <Text style={sh.stageSubtitle}>{t('wizard.vibe.subtitle')}</Text>
      <View style={sh.optionStack}>
        {VIBES.map((v) => (
          <OptionCard
            key={v.id}
            icon={v.icon as React.ComponentProps<typeof Ionicons>['name']}
            title={t(`wizard.vibe.labels.${v.id}`, v.label)}
            subtitle=""
            iconColor="#8B72BE"
            iconBg="#F3F0FF"
            onPress={() => goTo('pace', { selectedVibe: v.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Stage 3: Pace ───────────────────────────────────────────────────────────

function S4Pace({ goTo }: { goTo: GoTo }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sh = makeStyles(colors);

  const paceOptions = [
    {
      id: 'packed' as const,
      icon: 'flash-outline' as const,
      title: t('wizard.pace.packedTitle'),
      subtitle: t('wizard.pace.packedSubtitle'),
    },
    {
      id: 'balanced' as const,
      icon: 'sunny-outline' as const,
      title: t('wizard.pace.balancedTitle'),
      subtitle: t('wizard.pace.balancedSubtitle'),
    },
    {
      id: 'relaxed' as const,
      icon: 'leaf-outline' as const,
      title: t('wizard.pace.relaxedTitle'),
      subtitle: t('wizard.pace.relaxedSubtitle'),
    },
  ];

  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <Text style={sh.stageTitle}>{t('wizard.pace.title')}</Text>
      <Text style={sh.stageSubtitle}>{t('wizard.pace.subtitle')}</Text>
      <View style={sh.optionStack}>
        {paceOptions.map((opt) => (
          <OptionCard
            key={opt.id}
            icon={opt.icon}
            title={opt.title}
            subtitle={opt.subtitle}
            onPress={() => goTo('results', { pace: opt.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Wizard place card (preview only) ────────────────────────────────────────

function WizardPlaceCard({ place, colors, sh }: {
  place: PlaceResult;
  colors: ColorPalette;
  sh: ReturnType<typeof makeStyles>;
}) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <View style={sh.wzCard}>
      {place.photoUrl && !imgErr ? (
        <WizardPlaceImage uri={place.photoUrl} style={sh.wzPhoto} onError={() => setImgErr(true)} />
      ) : (
        <View style={[sh.wzPhoto, sh.wzPhotoPlaceholder]}>
          <Ionicons name="image-outline" size={22} color={colors.border} />
        </View>
      )}
      <View style={sh.wzCardBody}>
        <Text style={sh.wzName} numberOfLines={1}>{place.name}</Text>
        {place.rating !== null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="star" size={10} color="#F4B400" />
            <Text style={sh.wzRating}>{place.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function WizardPlaceImage({ uri, style, onError }: { uri: string; style: object; onError: () => void }) {
  return <Image source={{ uri }} style={style} onError={onError} resizeMode="cover" />;
}

// ─── Stage 4: Results ────────────────────────────────────────────────────────

function S5Results({
  answers,
  navigation,
}: {
  answers: WizardAnswers;
  navigation: Props['navigation'];
}) {
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const sh         = makeStyles(colors);
  const [creating, setCreating] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{ restaurants: PlaceResult[]; attractions: PlaceResult[] } | null>(null);

  const dest   = answers.destination.trim() || null;

  useEffect(() => {
    if (!dest) return;
    setPreviewLoading(true);
    Promise.all([
      fetchPlaces(dest, 'restaurants'),
      fetchPlaces(dest, 'attractions'),
    ]).then(([restaurants, attractions]) => {
      setPreview({
        restaurants: restaurants.slice(0, 3),
        attractions: attractions.slice(0, 3),
      });
    }).catch(() => { /* silent fail */ }).finally(() => setPreviewLoading(false));
  }, []);
  const pace   = answers.pace!;
  const advice = getPacingAdvice(pace, answers.days, t);
  const tips   = answers.selectedVibe ? VIBE_TIPS[answers.selectedVibe] : null;
  const dates  = calcDates(answers.months, answers.days);
  const budget = parseFloat(answers.budgetPerPerson) || undefined;

  const monthStr = answers.months.length > 0
    ? answers.months
        .sort((a, b) => a - b)
        .map((m) => MONTH_SHORT[m - 1])
        .join(', ')
    : null;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const name    = dest ? `${dest.split(',')[0]} Trip` : 'My Trip';
      const photoQ  = dest || (answers.selectedVibe ?? '');
      const photoUrl = photoQ ? await fetchPhoto(photoQ) : null;
      const groupId = await createPlanTrip(
        name,
        'USD',
        dest ?? undefined,
        photoUrl ?? undefined,
        dates?.start,
        dates?.end,
        budget,
      );
      let stopIdx = 0;
      for (const stopName of answers.stops) {
        if (stopName.trim().length > 0) {
          await addTripStop(groupId, stopName.trim(), stopIdx++);
        }
      }
      navigation.replace('PlanDetail', { groupId });
    } catch {
      setCreating(false);
      Alert.alert(t('wizard.results.errorTitle'), t('wizard.results.errorMsg'));
    }
  };

  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <View style={sh.resultsHeader}>
        <Text style={sh.resultsDestination}>{dest ?? t('wizard.results.defaultDest')}</Text>
        <View style={sh.resultsMetaRow}>
          {answers.peopleCount > 0 && (
            <View style={sh.resultsMeta}>
              <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
              <Text style={sh.resultsMetaText}>
                {t('wizard.results.peopleCount', { count: answers.peopleCount })}
              </Text>
            </View>
          )}
          {monthStr && (
            <View style={sh.resultsMeta}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text style={sh.resultsMetaText}>{monthStr}</Text>
            </View>
          )}
          {answers.days > 0 && (
            <View style={sh.resultsMeta}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={sh.resultsMetaText}>
                {t('wizard.results.dayCount', { count: answers.days })}
              </Text>
            </View>
          )}
          {budget && (
            <View style={sh.resultsMeta}>
              <Ionicons name="wallet-outline" size={13} color={colors.textSecondary} />
              <Text style={sh.resultsMetaText}>
                {t('wizard.results.budgetPerPerson', { amount: budget.toFixed(0) })}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={sh.resultsSectionTitle}>{t('wizard.results.pacingPlan')}</Text>
      <View style={sh.pacingCard}>
        <View style={sh.pacingBadgeRow}>
          <View style={sh.pacingBadge}>
            <Text style={sh.pacingBadgeText}>{pace.toUpperCase()}</Text>
          </View>
          <Text style={sh.pacingHeadline}>{advice.headline}</Text>
        </View>
        <Text style={sh.pacingBody}>{advice.body}</Text>
        {advice.callout && (
          <View style={sh.pacingCallout}>
            <Ionicons name="bulb-outline" size={14} color={colors.coral} />
            <Text style={sh.pacingCalloutText}>{advice.callout}</Text>
          </View>
        )}
      </View>

      {dest && (previewLoading || preview) && (
        <>
          <Text style={sh.resultsSectionTitle}>{t('explore.topPicks', { dest })}</Text>
          {previewLoading && !preview ? (
            <Text style={sh.previewLoading}>{t('common.loading', 'Loading…')}</Text>
          ) : preview && (
            <>
              {(['restaurants', 'attractions'] as const).map((cat) => {
                const places = preview[cat];
                if (!places || places.length === 0) return null;
                return (
                  <View key={cat} style={sh.previewCatBlock}>
                    <Text style={sh.previewCatLabel}>{t(`explore.cat_${cat}`)}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {places.map((p) => (
                        <WizardPlaceCard key={p.id} place={p} colors={colors} sh={sh} />
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
              <Text style={sh.previewExploreHint}>{t('explore.subtitle')} →</Text>
            </>
          )}
        </>
      )}

      {tips && (
        <>
          <Text style={sh.resultsSectionTitle}>{t('wizard.results.tips')}</Text>
          <View style={sh.tipsCard}>
            {tips.map((tip, i) => (
              <View key={i} style={[sh.tipRow, i > 0 && sh.tipRowBorder]}>
                <View style={sh.tipIconBg}>
                  <Ionicons
                    name={tip.icon as React.ComponentProps<typeof Ionicons>['name']}
                    size={14}
                    color="#8B72BE"
                  />
                </View>
                <Text style={sh.tipText}>{t(`wizard.tips.${answers.selectedVibe}_${i}`, tip.text)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {dest && (
        <>
          <Text style={sh.resultsSectionTitle}>{t('wizard.results.usefulSearches')}</Text>
          <View style={sh.linksRow}>
            <Pressable
              style={sh.linkChip}
              onPress={() => Linking.openURL(searchURL(`flights to ${dest}`))}
            >
              <Ionicons name="airplane-outline" size={14} color={colors.coral} />
              <Text style={sh.linkChipText}>{t('wizard.results.flights')}</Text>
            </Pressable>
            <Pressable
              style={sh.linkChip}
              onPress={() => Linking.openURL(searchURL(`${dest} travel guide`))}
            >
              <Ionicons name="book-outline" size={14} color={colors.coral} />
              <Text style={sh.linkChipText}>{t('wizard.results.guide')}</Text>
            </Pressable>
            <Pressable
              style={sh.linkChip}
              onPress={() => Linking.openURL(searchURL(`${dest} hotels accommodation`))}
            >
              <Ionicons name="bed-outline" size={14} color={colors.coral} />
              <Text style={sh.linkChipText}>{t('wizard.results.hotels')}</Text>
            </Pressable>
          </View>
        </>
      )}

      <Pressable
        style={[sh.createBtn, creating && { opacity: 0.7 }]}
        onPress={handleCreate}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
        )}
        <Text style={sh.createBtnText}>
          {creating ? t('wizard.results.creating') : t('wizard.results.create')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TripWizardScreen({ navigation }: Props) {
  const [answers, setAnswers] = useState<WizardAnswers>(INITIAL_ANSWERS);
  const [history, setHistory] = useState<Stage[]>(['basics']);
  const scrollRef = useRef<ScrollView>(null);

  const currentStage = history[history.length - 1];
  const progressStep = getProgressStep(currentStage);

  const updateAnswers = (updates: Partial<WizardAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...updates }));
  };

  const goTo: GoTo = (stage, updates) => {
    if (updates) setAnswers((prev) => ({ ...prev, ...updates }));
    setHistory((prev) => [...prev, stage]);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      navigation.goBack();
    }
  };

  const stageProps = { answers, updateAnswers, goTo };

  return (
    <WizardContainer
      onBack={goBack}
      onClose={() => navigation.goBack()}
      progressStep={progressStep}
    >
      {currentStage === 'basics'    && <S2Basics {...stageProps} />}
      {currentStage === 'vibe_pick' && <S3VibePick goTo={goTo} />}
      {currentStage === 'pace'      && <S4Pace goTo={goTo} />}
      {currentStage === 'results'   && <S5Results answers={answers} navigation={navigation} />}
    </WizardContainer>
  );
}
