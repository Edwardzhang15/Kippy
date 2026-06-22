import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { HomeStackParamList } from '../navigation/types';
import { getGroupDetails, createSubgroup, MemberWithBalance } from '../db';
import { colors, fontSizes, radii, cardShadow } from '../theme';
import { getAvatarColor, getInitials } from '../utils';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateSubgroup'>;

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

export default function CreateSubgroupScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<MemberWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName]       = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getGroupDetails(route.params.groupId).then((data) => {
      if (data) {
        setMembers(data.members);
        setSelected(data.members.map((m) => m.id));
      }
      setLoading(false);
    });
  }, [route.params.groupId]);

  const toggleMember = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canSave = name.trim().length > 0 && selected.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createSubgroup(route.params.groupId, name.trim(), selected);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={styles.headerTitle}>{t('createSubgroup.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.coral} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel title={t('createSubgroup.name')} />
            <View style={[styles.inputCard, cardShadow]}>
              <TextInput
                style={styles.input}
                placeholder={t('createSubgroup.namePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
              />
            </View>

            <SectionLabel title={t('createSubgroup.members')} />
            <View style={[styles.membersCard, cardShadow]}>
              {members.map((member, i) => {
                const isSelected = selected.includes(member.id);
                return (
                  <View key={member.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <Pressable
                      style={({ pressed }) => [
                        styles.memberRow,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => toggleMember(member.id)}
                    >
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: isSelected ? getAvatarColor(i) : colors.border },
                        ]}
                      >
                        <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.memberName,
                          isSelected && styles.memberNameSelected,
                        ]}
                      >
                        {member.name}
                      </Text>
                      <View
                        style={[
                          styles.checkCircle,
                          isSelected && styles.checkCircleSelected,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        <View style={styles.saveContainer}>
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>
              {saving ? t('createSubgroup.saving') : t('createSubgroup.create')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 24,
  },
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    fontSize: fontSizes.body,
    color: colors.textPrimary,
    paddingVertical: 14,
  },
  membersCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  memberName: {
    flex: 1,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  memberNameSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  saveContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: colors.coral,
    borderRadius: radii.button,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.coral,
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
});
