import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { type ColorPalette, fontSizes } from '../theme';
import { useTheme } from '../context/ThemeContext';

export type SheetOption = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 16,
  },
  cancelDivider: {
    marginTop: 8,
  },
  option: {
    paddingHorizontal: 24,
    paddingVertical: 17,
    alignItems: 'center',
  },
  optionText: {
    fontSize: fontSizes.body,
    fontWeight: '500',
    color: c.textPrimary,
  },
  destructiveText: {
    color: c.coral,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: c.coral,
  },
});

export default function ActionSheet({
  visible,
  options,
  cancelLabel,
  onCancel,
}: {
  visible: boolean;
  options: SheetOption[];
  cancelLabel: string;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View style={styles.sheet}>
          {options.map((opt, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [styles.option, pressed && { opacity: 0.65 }]}
                onPress={() => { onCancel(); opt.onPress(); }}
              >
                <Text style={[styles.optionText, opt.destructive && styles.destructiveText]}>
                  {opt.label}
                </Text>
              </Pressable>
            </View>
          ))}
          <View style={[styles.divider, styles.cancelDivider]} />
          <Pressable
            style={({ pressed }) => [styles.option, pressed && { opacity: 0.65 }]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
