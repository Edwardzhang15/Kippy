import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type ColorPalette } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  onPress: () => void;
  locked?: boolean;
};

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.coral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.textPrimary,
    borderWidth: 2,
    borderColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function AnimatedFAB({ onPress, locked = false }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <Ionicons name="add" size={28} color="#fff" />
      {locked && (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={11} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}
