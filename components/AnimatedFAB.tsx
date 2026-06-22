import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type ColorPalette } from '../theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  onPress: () => void;
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
});

export default function AnimatedFAB({ onPress }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
}
