import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  useIAP,
  getAvailablePurchases,
  ErrorCode,
  type Purchase,
} from 'expo-iap';
import { type ColorPalette, fontSizes, radii } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { recordPurchase, isPremium, FULL_ACCESS_PRODUCT_ID } from '../db';

const FALLBACK_PRICE = '$3.99';

const FEATURE_KEYS = [
  'featureUnlimitedGroupTrips',
  'featureUnlimitedPersonalTrips',
  'featurePlanningTools',
  'featureKipsFavs',
  'featureShareableCards',
] as const;

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 1,
    width: 32, height: 32, borderRadius: 16, backgroundColor: c.card,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32, alignItems: 'center' },
  image: { width: 160, height: 160, marginBottom: 12 },
  headline: {
    fontSize: fontSizes.screenTitle, fontWeight: '800', color: c.textPrimary,
    textAlign: 'center', marginBottom: 8,
  },
  subheading: {
    fontSize: fontSizes.body, color: c.textSecondary, textAlign: 'center',
    lineHeight: 21, marginBottom: 28, paddingHorizontal: 8,
  },
  featureList: {
    alignSelf: 'stretch', backgroundColor: c.card, borderRadius: radii.card,
    padding: 18, gap: 14, marginBottom: 28,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: `${c.coral}1F`,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontSize: fontSizes.body, fontWeight: '600', color: c.textPrimary, flex: 1 },
  unlockBtn: {
    alignSelf: 'stretch', backgroundColor: c.coral, borderRadius: radii.button,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: c.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  unlockBtnDisabled: { opacity: 0.6 },
  unlockBtnText: { fontSize: fontSizes.body, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  restoreBtn: { marginTop: 16, paddingVertical: 8 },
  restoreBtnText: { fontSize: fontSizes.caption, fontWeight: '600', color: c.textSecondary },
  laterBtn: { marginTop: 8, paddingVertical: 8 },
  laterBtnText: { fontSize: fontSizes.caption, color: c.textSecondary },
});

export default function PaywallScreen() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring]   = useState(false);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      try {
        await finishTransaction({ purchase, isConsumable: false });
        await recordPurchase(purchase.productId);
        navigation.goBack();
      } finally {
        setPurchasing(false);
      }
    },
    onPurchaseError: (error) => {
      setPurchasing(false);
      if (error.code === ErrorCode.UserCancelled) return;
      const message = error.code === ErrorCode.NetworkError
        ? t('paywall.errorNetwork')
        : t('paywall.errorGeneric');
      Alert.alert(t('paywall.errorTitle'), message);
    },
  });

  useEffect(() => {
    // Wait for the store connection the hook establishes on mount — calling
    // fetchProducts before it's ready would reject (it re-throws after its
    // own onError), and the fallback price label already covers a failed fetch.
    if (!connected) return;
    fetchProducts({ skus: [FULL_ACCESS_PRODUCT_ID], type: 'in-app' }).catch(() => {});
  }, [connected, fetchProducts]);

  const product = products.find(p => p.id === FULL_ACCESS_PRODUCT_ID);
  const priceLabel = product?.displayPrice ?? FALLBACK_PRICE;

  const handleUnlock = () => {
    setPurchasing(true);
    requestPurchase({
      request: { apple: { sku: FULL_ACCESS_PRODUCT_ID } },
      type: 'in-app',
    }).catch((error) => {
      // Real failures also arrive via onPurchaseError above; this only
      // guards against the request itself failing to even initiate
      // (e.g. store not connected yet), which wouldn't otherwise reach it.
      setPurchasing(false);
      if (error?.code === ErrorCode.UserCancelled) return;
      Alert.alert(t('paywall.errorTitle'), t('paywall.errorGeneric'));
    });
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await getAvailablePurchases();
      const owned = restored.some(p => p.productId === FULL_ACCESS_PRODUCT_ID);
      if (owned) {
        await recordPurchase(FULL_ACCESS_PRODUCT_ID);
        navigation.goBack();
        return;
      }
      // Fall back to the already-recorded local flag in case the store's
      // available-purchases list doesn't surface it for some reason.
      if (await isPremium()) {
        navigation.goBack();
        return;
      }
      Alert.alert(t('paywall.restoreNoneTitle'), t('paywall.restoreNoneMessage'));
    } catch {
      Alert.alert(t('paywall.errorTitle'), t('paywall.errorGeneric'));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
        <Ionicons name="close" size={18} color={colors.textPrimary} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Image source={require('../assets/Kip_think.png')} style={styles.image} resizeMode="contain" />

        <Text style={styles.headline}>{t('paywall.headline')}</Text>
        <Text style={styles.subheading}>{t('paywall.subheading')}</Text>

        <View style={styles.featureList}>
          {FEATURE_KEYS.map(key => (
            <View key={key} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="checkmark" size={15} color={colors.coral} />
              </View>
              <Text style={styles.featureText}>{t(`paywall.${key}`)}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.unlockBtn, (purchasing || restoring) && styles.unlockBtnDisabled]}
          onPress={handleUnlock}
          disabled={purchasing || restoring}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.unlockBtnText}>{t('paywall.unlockButton', { price: priceLabel })}</Text>
          )}
        </Pressable>

        <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing || restoring}>
          <Text style={styles.restoreBtnText}>
            {restoring ? t('paywall.restoring') : t('paywall.restoreButton')}
          </Text>
        </Pressable>

        <Pressable style={styles.laterBtn} onPress={() => navigation.goBack()} disabled={purchasing || restoring}>
          <Text style={styles.laterBtnText}>{t('paywall.maybeLater')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
