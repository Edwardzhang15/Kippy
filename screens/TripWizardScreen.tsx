import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { createPlanTrip } from '../db';
import { colors, fontSizes, radii, cardShadow } from '../theme';
import {
  VIBES,
  VIBE_DESTINATIONS,
  VIBE_TIPS,
  TRANSPORT_OPTIONS,
  MONTH_SHORT,
  getPacingAdvice,
  type Vibe,
} from '../data/wizardData';

type Props = NativeStackScreenProps<PlanStackParamList, 'TripWizard'>;

// ─── Types ───────────────────────────────────────────────────────────────────

type Stage =
  | 'mode'
  | 'agent_result'
  | 'tour_result'
  | 'basics'
  | 'dest_branch'
  | 'dest_input'
  | 'vibe_pick'
  | 'vibe_results'
  | 'pace'
  | 'results';

type WizardAnswers = {
  tripMode: 'self' | 'agent' | 'tour' | null;
  peopleCount: number;
  transport: string | null;
  months: number[];
  days: number;
  budgetPerPerson: string;
  hasDestination: 'yes' | 'ideas' | null;
  destination: string;
  selectedVibe: Vibe | null;
  pickedDestination: string | null;
  pace: 'packed' | 'balanced' | 'relaxed' | null;
};

type GoTo = (stage: Stage, updates?: Partial<WizardAnswers>) => void;

const INITIAL_ANSWERS: WizardAnswers = {
  tripMode: null,
  peopleCount: 2,
  transport: null,
  months: [],
  days: 7,
  budgetPerPerson: '',
  hasDestination: null,
  destination: '',
  selectedVibe: null,
  pickedDestination: null,
  pace: null,
};

const UNSPLASH_KEY = '_dJ9KWj8_6gx-it3O-USLvSCHVRLH39n2okh6S3Onlo';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProgressStep(stage: Stage): number | null {
  if (stage === 'mode') return 1;
  if (stage === 'basics') return 2;
  if (['dest_branch', 'dest_input', 'vibe_pick', 'vibe_results'].includes(stage)) return 3;
  if (stage === 'pace') return 4;
  if (stage === 'results') return 5;
  return null;
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

// ─── Shared UI ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={sh.sectionLabel}>{children}</Text>;
}

function OptionCard({
  icon,
  title,
  subtitle,
  onPress,
  iconColor = colors.coral,
  iconBg = '#FFF0EE',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [sh.optionCard, cardShadow, pressed && { opacity: 0.82 }]}
      onPress={onPress}
    >
      <View style={[sh.optionIconBg, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
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
  progressStep: number | null;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={sh.safe}>
      <View style={sh.navRow}>
        <Pressable onPress={onBack} hitSlop={12} style={sh.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        {progressStep !== null && (
          <View style={sh.progressRow}>
            {[1, 2, 3, 4, 5].map((step) => (
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
        )}

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

// ─── Stage 1: Mode ───────────────────────────────────────────────────────────

function S1Mode({ goTo }: { goTo: GoTo }) {
  const { t } = useTranslation();

  const modeOptions = [
    {
      id: 'self' as const,
      icon: 'compass-outline' as const,
      title: t('wizard.mode.selfTitle'),
      subtitle: t('wizard.mode.selfSubtitle'),
    },
    {
      id: 'agent' as const,
      icon: 'briefcase-outline' as const,
      title: t('wizard.mode.agentTitle'),
      subtitle: t('wizard.mode.agentSubtitle'),
    },
    {
      id: 'tour' as const,
      icon: 'people-outline' as const,
      title: t('wizard.mode.tourTitle'),
      subtitle: t('wizard.mode.tourSubtitle'),
    },
  ];

  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <Text style={sh.stageTitle}>{t('wizard.mode.title')}</Text>
      <Text style={sh.stageSubtitle}>{t('wizard.mode.subtitle')}</Text>
      <View style={sh.optionStack}>
        {modeOptions.map((opt) => (
          <OptionCard
            key={opt.id}
            icon={opt.icon}
            title={opt.title}
            subtitle={opt.subtitle}
            onPress={() => {
              const next: Stage =
                opt.id === 'self'  ? 'basics'
                : opt.id === 'agent' ? 'agent_result'
                : 'tour_result';
              goTo(next, { tripMode: opt.id });
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Stage 1 branches: Agent & Tour ──────────────────────────────────────────

function S1AgentResult({ navigation }: { navigation: Props['navigation'] }) {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <Text style={sh.stageTitle}>{t('wizard.agent.title')}</Text>
      <Text style={sh.stageParagraph}>{t('wizard.agent.para1')}</Text>
      <Text style={sh.stageParagraph}>{t('wizard.agent.para2')}</Text>
      <Pressable
        style={sh.linkBtn}
        onPress={() => Linking.openURL(searchURL('travel agents near me'))}
      >
        <Ionicons name="search-outline" size={16} color={colors.coral} />
        <Text style={sh.linkBtnText}>{t('wizard.agent.searchLink')}</Text>
      </Pressable>

      <View style={sh.divider} />
      <Text style={sh.orLabel}>{t('wizard.agent.orLabel')}</Text>
      <ContinueButton
        label={t('wizard.agent.createBasic')}
        onPress={() => navigation.replace('CreatePlan')}
      />
    </ScrollView>
  );
}

function S1TourResult({ navigation }: { navigation: Props['navigation'] }) {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <Text style={sh.stageTitle}>{t('wizard.tour.title')}</Text>
      <Text style={sh.stageParagraph}>{t('wizard.tour.para1')}</Text>
      <Text style={sh.stageParagraph}>{t('wizard.tour.para2')}</Text>
      <Pressable
        style={sh.linkBtn}
        onPress={() => Linking.openURL(searchURL('group tours abroad 2026'))}
      >
        <Ionicons name="search-outline" size={16} color={colors.coral} />
        <Text style={sh.linkBtnText}>{t('wizard.tour.searchLink')}</Text>
      </Pressable>

      <View style={sh.divider} />
      <Text style={sh.orLabel}>{t('wizard.tour.orLabel')}</Text>
      <ContinueButton
        label={t('wizard.agent.createBasic')}
        onPress={() => navigation.replace('CreatePlan')}
      />
    </ScrollView>
  );
}

// ─── Stage 2: Basics ─────────────────────────────────────────────────────────

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

        <ContinueButton onPress={() => goTo('dest_branch')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Stage 3a: Destination branch ────────────────────────────────────────────

function S3DestBranch({ goTo }: { goTo: GoTo }) {
  const { t } = useTranslation();
  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <Text style={sh.stageTitle}>{t('wizard.dest.branchTitle')}</Text>
      <View style={sh.optionStack}>
        <OptionCard
          icon="location-outline"
          title={t('wizard.dest.hasDestTitle')}
          subtitle={t('wizard.dest.hasDestSubtitle')}
          onPress={() => goTo('dest_input', { hasDestination: 'yes' })}
        />
        <OptionCard
          icon="sparkles-outline"
          title={t('wizard.dest.ideasTitle')}
          subtitle={t('wizard.dest.ideasSubtitle')}
          iconColor="#8B72BE"
          iconBg="#F3F0FF"
          onPress={() => goTo('vibe_pick', { hasDestination: 'ideas' })}
        />
      </View>
    </ScrollView>
  );
}

// ─── Stage 3b: Destination input ─────────────────────────────────────────────

function S3DestInput({
  answers,
  updateAnswers,
  goTo,
}: {
  answers: WizardAnswers;
  updateAnswers: (u: Partial<WizardAnswers>) => void;
  goTo: GoTo;
}) {
  const { t } = useTranslation();
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
        <Text style={sh.stageTitle}>{t('wizard.dest.inputTitle')}</Text>
        <Text style={sh.stageSubtitle}>{t('wizard.dest.inputSubtitle')}</Text>
        <View style={[sh.formCard, cardShadow, sh.inputCard]}>
          <Ionicons name="location-outline" size={18} color={colors.coral} />
          <TextInput
            style={sh.destInput}
            placeholder={t('wizard.dest.placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={answers.destination}
            onChangeText={(v) => updateAnswers({ destination: v })}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
        <ContinueButton
          onPress={() => goTo('pace')}
          disabled={answers.destination.trim().length === 0}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Stage 3c: Vibe pick ─────────────────────────────────────────────────────

function S3VibePick({ goTo }: { goTo: GoTo }) {
  const { t } = useTranslation();
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
            onPress={() => goTo('vibe_results', { selectedVibe: v.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Stage 3d: Vibe results ───────────────────────────────────────────────────

function S3VibeResults({
  answers,
  updateAnswers,
  goTo,
}: {
  answers: WizardAnswers;
  updateAnswers: (u: Partial<WizardAnswers>) => void;
  goTo: GoTo;
}) {
  const { t } = useTranslation();
  const vibe = answers.selectedVibe;
  if (!vibe) return null;

  const suggestions = VIBE_DESTINATIONS[vibe];
  const picked      = answers.pickedDestination;

  return (
    <ScrollView contentContainerStyle={sh.stageContent} showsVerticalScrollIndicator={false}>
      <Text style={sh.stageTitle}>{t('wizard.vibe.resultsTitle')}</Text>
      <Text style={sh.stageSubtitle}>
        {t('wizard.vibe.resultsSubtitle', {
          vibe: t(`wizard.vibe.labels.${vibe}`).toLowerCase(),
        })}
      </Text>

      {suggestions.map((s) => {
        const isSelected = picked === s.name;
        return (
          <Pressable
            key={s.name}
            style={[sh.suggestionCard, cardShadow, isSelected && sh.suggestionCardSelected]}
            onPress={() => updateAnswers({ pickedDestination: isSelected ? null : s.name })}
          >
            <View style={sh.suggestionHeader}>
              <Text style={sh.suggestionFlag}>{s.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={sh.suggestionName}>{s.name}</Text>
                <Text style={sh.suggestionTagline}>{t(`wizard.destinations.${s.key}.tagline`, s.tagline)}</Text>
              </View>
              {isSelected && (
                <View style={sh.suggestionCheck}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.coral} />
                </View>
              )}
            </View>
            <Text style={sh.suggestionBlurb}>{t(`wizard.destinations.${s.key}.blurb`, s.blurb)}</Text>
          </Pressable>
        );
      })}

      {picked ? (
        <ContinueButton
          label={t('wizard.vibe.continueWith', { dest: picked.split(',')[0] })}
          onPress={() => goTo('pace', { destination: picked })}
        />
      ) : (
        <Pressable style={sh.skipBtn} onPress={() => goTo('pace')}>
          <Text style={sh.skipBtnText}>{t('wizard.vibe.skip')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ─── Stage 4: Pace ───────────────────────────────────────────────────────────

function S4Pace({ goTo }: { goTo: GoTo }) {
  const { t } = useTranslation();

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

// ─── Stage 5: Results ────────────────────────────────────────────────────────

function S5Results({
  answers,
  navigation,
}: {
  answers: WizardAnswers;
  navigation: Props['navigation'];
}) {
  const { t }         = useTranslation();
  const [creating, setCreating] = useState(false);

  const dest   = answers.pickedDestination || answers.destination || null;
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
  const [history, setHistory] = useState<Stage[]>(['mode']);
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
      {currentStage === 'mode'         && <S1Mode goTo={goTo} />}
      {currentStage === 'agent_result' && <S1AgentResult navigation={navigation} />}
      {currentStage === 'tour_result'  && <S1TourResult  navigation={navigation} />}
      {currentStage === 'basics'       && <S2Basics {...stageProps} />}
      {currentStage === 'dest_branch'  && <S3DestBranch goTo={goTo} />}
      {currentStage === 'dest_input'   && <S3DestInput {...stageProps} />}
      {currentStage === 'vibe_pick'    && <S3VibePick goTo={goTo} />}
      {currentStage === 'vibe_results' && <S3VibeResults {...stageProps} />}
      {currentStage === 'pace'         && <S4Pace goTo={goTo} />}
      {currentStage === 'results'      && <S5Results answers={answers} navigation={navigation} />}
    </WizardContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.border,
  },
  dotDone: {
    backgroundColor: colors.coral,
    opacity: 0.45,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.coral,
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
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 36,
  },
  stageSubtitle: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 21,
  },
  stageParagraph: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 14,
  },

  optionStack: {
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    backgroundColor: colors.card,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepperSuffix: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  formCard: {
    backgroundColor: colors.card,
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
    color: colors.textSecondary,
  },
  budgetInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  destInput: {
    flex: 1,
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingVertical: 6,
  },

  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '700',
    color: colors.textSecondary,
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
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: '#FFF0EE',
    borderColor: colors.coral,
  },
  chipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.coral,
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
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  monthChipSelected: {
    backgroundColor: '#FFF0EE',
    borderColor: colors.coral,
  },
  monthChipText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  monthChipTextSelected: {
    color: colors.coral,
  },

  continueBtn: {
    backgroundColor: colors.coral,
    borderRadius: radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.coral,
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

  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  skipBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24,
  },
  orLabel: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginBottom: 12,
  },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0EE',
    borderRadius: radii.button,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  linkBtnText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.coral,
  },

  suggestionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  suggestionCardSelected: {
    borderColor: colors.coral,
    backgroundColor: '#FFFBFB',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  suggestionFlag: {
    fontSize: 28,
    lineHeight: 32,
  },
  suggestionName: {
    fontSize: fontSizes.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  suggestionTagline: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: colors.coral,
  },
  suggestionCheck: {
    marginLeft: 'auto',
  },
  suggestionBlurb: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  resultsHeader: {
    marginBottom: 28,
  },
  resultsDestination: {
    fontSize: fontSizes.screenTitle,
    fontWeight: '800',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resultsSectionTitle: {
    fontSize: fontSizes.sectionTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },

  pacingCard: {
    backgroundColor: '#FFF0EE',
    borderRadius: radii.card,
    padding: 18,
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },
  pacingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pacingBadge: {
    backgroundColor: colors.coral,
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
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  pacingBody: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
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
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },

  tipsCard: {
    backgroundColor: colors.card,
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
    borderTopColor: colors.border,
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
    color: colors.textPrimary,
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
    color: colors.coral,
  },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sage,
    borderRadius: radii.button,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: colors.sage,
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
});
