import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { initializeErrorReporting, withErrorBoundary } from './src/monitoring/errorReporter';
import { configureNotifications, syncPushRegistration } from './src/notifications/syncPushRegistration';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './src/api/client';
import { LANGUAGE_OPTIONS, LOCALE_MAP, LanguageCode, TranslationKey, translations, statusLabels } from './src/i18n/translations';
import { useStompSubscriptions } from './src/realtime/useStompSubscriptions';
import { CurrencyCode, usePreferencesStore } from './src/store/preferences';
import { useSessionStore } from './src/store/session';
import { Booking, BookingStatus, Category, Review, WorkerCard } from './src/types';

initializeErrorReporting();
configureNotifications();

const queryClient = new QueryClient();
const REFRESH_INTERVAL_MS = 5000;
const DEFAULT_MAP_REGION = { latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const ENABLE_NATIVE_MAPS = process.env.EXPO_PUBLIC_ENABLE_NATIVE_MAPS === 'true';
const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : 'height';
const KEYBOARD_VERTICAL_OFFSET = Platform.OS === 'ios' ? 0 : 20;
const CATEGORY_FALLBACKS: Category[] = [
  { id: 'plumbing', code: 'PLUMBING', name: 'Plumbing', icon: '\u{1F527}' },
  { id: 'electrical', code: 'ELECTRICAL', name: 'Electrical', icon: '\u26A1' },
  { id: 'carpentry', code: 'CARPENTRY', name: 'Carpentry', icon: '\u{1FA9A}' },
  { id: 'painting', code: 'PAINTING', name: 'Painting', icon: '\u{1F58C}' },
  { id: 'cleaning', code: 'CLEANING', name: 'Cleaning', icon: '\u2728' },
  { id: 'handyman', code: 'HANDYMAN', name: 'Handyman', icon: '\u{1F9F0}' },
  { id: 'gardening', code: 'GARDENING', name: 'Gardening', icon: '\u{1F331}' },
  { id: 'appliance', code: 'APPLIANCE', name: 'Appliance', icon: '\u{1F50C}' },
];
const CATEGORY_ORDER = CATEGORY_FALLBACKS.map((category) => category.code);
const CURRENCY_OPTIONS: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'INR', label: 'INR' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
  { code: 'GBP', label: 'GBP' },
  { code: 'AED', label: 'AED' },
  { code: 'CAD', label: 'CAD' },
  { code: 'AUD', label: 'AUD' },
];
const THEME = {
  bg: '#F4EFE6',
  bgSoft: '#EEE5D7',
  card: '#FFF9F1',
  ink: '#22313F',
  muted: '#66737F',
  teal: '#0F766E',
  tealSoft: '#DCEFE7',
  amber: '#E7A64A',
  amberSoft: '#F8E4BF',
  coral: '#D97757',
  border: '#E8DCC8',
  white: '#FFFFFF',
  danger: '#B42318',
};
const WORKER_STATUS_ACTIONS: Partial<Record<BookingStatus, BookingStatus[]>> = { ACCEPTED: ['ON_THE_WAY'], CONFIRMED: ['ON_THE_WAY'], ON_THE_WAY: ['ARRIVED'], ARRIVED: ['IN_PROGRESS'] };
const CUSTOMER_STATUS_ACTIONS: Partial<Record<BookingStatus, BookingStatus[]>> = { ACCEPTED: ['CONFIRMED'], ARRIVED: ['COMPLETED'], IN_PROGRESS: ['COMPLETED'] };
const CATEGORY_LABELS: Record<string, Record<LanguageCode, string>> = {
  PLUMBING: { en: 'Plumbing', hi: '\u092A\u094D\u0932\u0902\u092C\u093F\u0902\u0917', mr: '\u092A\u094D\u0932\u0902\u092C\u093F\u0902\u0917', te: '\u0C2A\u0C4D\u0C32\u0C02\u0C2C\u0C3F\u0C02\u0C17\u0C4D', ta: '\u0BAA\u0BBF\u0BB3\u0BAE\u0BCD\u0BAA\u0BBF\u0B99\u0BCD', gu: '\u0AAA\u0ACD\u0AB2\u0A82\u0AAC\u0ABF\u0A82\u0A97' },
  ELECTRICAL: { en: 'Electrical', hi: '\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u093F\u0915\u0932', mr: '\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u093F\u0915\u0932', te: '\u0C0E\u0C32\u0C46\u0C15\u0C4D\u0C1F\u0C4D\u0C30\u0C3F\u0C15\u0C32\u0C4D', ta: '\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0BA3\u0BC1', gu: '\u0A87\u0AB2\u0AC7\u0A95\u0ACD\u0A9F\u0ACD\u0AB0\u0ABF\u0A95\u0AB2' },
  CARPENTRY: { en: 'Carpentry', hi: '\u092C\u0922\u093C\u0908 \u0915\u093E \u0915\u093E\u092E', mr: '\u0938\u0941\u0924\u093E\u0930\u0915\u093E\u092E', te: '\u0C15\u0C3E\u0C30\u0C4D\u0C2A\u0C46\u0C02\u0C1F\u0C4D\u0C30\u0C40', ta: '\u0BA4\u0B9A\u0BCD\u0B9A\u0BC1 \u0BAA\u0BA3\u0BBF', gu: '\u0AB8\u0AC1\u0AA4\u0ABE\u0AB0\u0A95\u0ABE\u0AAE' },
  PAINTING: { en: 'Painting', hi: '\u092A\u0947\u0902\u091F\u093F\u0902\u0917', mr: '\u092A\u0947\u0902\u091F\u093F\u0902\u0917', te: '\u0C2A\u0C46\u0C2F\u0C3F\u0C02\u0C1F\u0C3F\u0C02\u0C17\u0C4D', ta: '\u0BAA\u0BC7\u0BAF\u0BBF\u0BA3\u0BCD\u0B9F\u0BBF\u0B99\u0BCD', gu: '\u0AAA\u0AC7\u0A87\u0AA8\u0ACD\u0A9F\u0ABF\u0A82\u0A97' },
  CLEANING: { en: 'Cleaning', hi: '\u0938\u092B\u093E\u0908', mr: '\u0938\u094D\u0935\u091A\u094D\u091B\u0924\u093E', te: '\u0C36\u0C41\u0C2D\u0C4D\u0C30\u0C2A\u0C30\u0C1A\u0C21\u0C02', ta: '\u0B9A\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD', gu: '\u0AB8\u0AAB\u0ABE\u0A88' },
  HANDYMAN: { en: 'Handyman', hi: '\u0939\u0948\u0902\u0921\u0940\u092E\u0948\u0928', mr: '\u0939\u0901\u0921\u0940\u092E\u0945\u0928', te: '\u0C39\u0C4D\u0C2F\u0C3E\u0C02\u0C21\u0C40\u0C2E\u0C4D\u0C2F\u0C3E\u0C28\u0C4D', ta: '\u0BB9\u0BC7\u0BA3\u0BCD\u0B9F\u0BBF\u0BAE\u0BC7\u0BA9\u0BCD', gu: '\u0AB9\u0AC7\u0AA8\u0ACD\u0AA1\u0AC0\u0AAE\u0AC7\u0AA8' },
  GARDENING: { en: 'Gardening', hi: '\u092C\u093E\u0917\u0935\u093E\u0928\u0940', mr: '\u092C\u093E\u0917\u0915\u093E\u092E', te: '\u0C24\u0C4B\u0C1F\u0C2A\u0C28\u0C3F', ta: '\u0BA4\u0BCB\u0B9F\u0BCD\u0B9F\u0BAA\u0BCD\u0BAA\u0BA3\u0BBF', gu: '\u0AAC\u0ABE\u0A97\u0AAC\u0A97\u0AC0\u0A9A\u0ACB' },
  APPLIANCE: { en: 'Appliance', hi: '\u0909\u092A\u0915\u0930\u0923', mr: '\u0909\u092A\u0915\u0930\u0923', te: '\u0C09\u0C2A\u0C15\u0C30\u0C23\u0C02', ta: '\u0B89\u0BAA\u0B95\u0BB0\u0BA3\u0BAE\u0BCD', gu: '\u0A89\u0AAA\u0A95\u0AB0\u0AA3' },
};

function useI18n() {
  const language = usePreferencesStore((state) => state.language);
  const currency = usePreferencesStore((state) => state.currency);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const t = (key: TranslationKey): string => translations[language][key] ?? translations.en[key] ?? key;
  return { language, currency, setLanguage, setCurrency, t };
}

function formatCurrency(value: number | null | undefined, language: LanguageCode, currency: CurrencyCode, t: (key: TranslationKey) => string) {
  if (value === null || value === undefined || Number.isNaN(value)) return t('notAvailable');
  try {
    return new Intl.NumberFormat(LOCALE_MAP[language], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

function formatDate(date: string, language: LanguageCode) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(LOCALE_MAP[language], {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  } catch {
    return parsed.toLocaleString(LOCALE_MAP[language]);
  }
}

function formatStatus(status: BookingStatus, language: LanguageCode) {
  return statusLabels[language][status] ?? status.replaceAll('_', ' ');
}

function formatCategoryLabel(category: string, language: LanguageCode) {
  const key = category.toUpperCase().replace(/\s+/g, '_');
  return CATEGORY_LABELS[key]?.[language] ?? category.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function joinMeta(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' | ');
}

function categoryIcon(category: Pick<Category, 'code' | 'icon'>) {
  const iconMap: Record<string, string> = {
    wrench: '\u{1F527}',
    bolt: '\u26A1',
    hammer: '\u{1FA9A}',
    paintbrush: '\u{1F58C}',
    sparkles: '\u2728',
    toolbox: '\u{1F9F0}',
    leaf: '\u{1F331}',
    settings: '\u{1F50C}',
    appliance: '\u{1F50C}',
  };
  const rawIcon = category.icon?.trim();
  const normalizedIcon = rawIcon ? iconMap[rawIcon.toLowerCase()] ?? rawIcon : null;
  return normalizedIcon || CATEGORY_FALLBACKS.find((item) => item.code === category.code)?.icon || '\u{1F9F0}';
}

function orderedCategories(categories?: Category[]) {
  const merged = new Map<string, Category>();
  CATEGORY_FALLBACKS.forEach((category) => {
    merged.set(category.code, category);
  });
  (categories ?? []).forEach((category) => {
    const fallback = merged.get(category.code);
    merged.set(category.code, {
      ...fallback,
      ...category,
      icon: categoryIcon({ code: category.code, icon: category.icon }) || fallback?.icon || '\\u{1F9F0}',
    });
  });
  return [...merged.values()].sort((left, right) => {
    const leftIndex = CATEGORY_ORDER.indexOf(left.code);
    const rightIndex = CATEGORY_ORDER.indexOf(right.code);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
}

function openDirections(latitude: number, longitude: number, errorMessage: string) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
  return Linking.openURL(url).catch(() => Alert.alert(errorMessage));
}

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(offset, { toValue: 0, duration: 440, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, offset]);
  return <Animated.View style={{ opacity, transform: [{ translateY: offset }] }}>{children}</Animated.View>;
}

function DecorativeBackground() {
  return (
    <View pointerEvents="none" style={styles.bgDecor}>
      <View style={styles.bgBlobA} />
      <View style={styles.bgBlobB} />
      <View style={styles.bgBlobC} />
    </View>
  );
}

function ScreenFrame({ children, contentContainerStyle }: { children: React.ReactNode; contentContainerStyle?: object }) {
  return (
    <SafeAreaView style={styles.container}>
      <DecorativeBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR} keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}>
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FixCartLogo({ compact = false, caption }: { compact?: boolean; caption?: string }) {
  return (
    <View style={styles.logoWrap}>
      <View style={[styles.logoMark, compact && styles.logoMarkCompact]}>
        <View style={styles.logoHandle} />
        <View style={styles.logoTray} />
        <View style={styles.logoWheelLeft} />
        <View style={styles.logoWheelRight} />
        <View style={styles.logoSpark} />
      </View>
      <View>
        <Text style={[styles.logoText, compact && styles.logoTextCompact]}>FixCart</Text>
        {!compact ? <Text style={styles.logoCaption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

function LanguageSwitcher() {
  const { language, currency, setLanguage, setCurrency, t } = useI18n();
  return (
    <View style={styles.languageWrap}>
      <Text style={styles.languageLabel}>{t('language')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRow}>
        {LANGUAGE_OPTIONS.map((option) => {
          const active = option.code === language;
          return (
            <TouchableOpacity key={option.code} style={[styles.languageChip, active && styles.languageChipActive]} onPress={() => void setLanguage(option.code)}>
              <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={[styles.languageLabel, styles.preferenceLabel]}>{t('currency')}</Text>
      <Text style={styles.sectionHint}>{t('currencyHint')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRow}>
        {CURRENCY_OPTIONS.map((option) => {
          const active = option.code === currency;
          return (
            <TouchableOpacity key={option.code} style={[styles.languageChip, active && styles.languageChipActive]} onPress={() => void setCurrency(option.code)}>
              <Text style={[styles.languageChipText, active && styles.languageChipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ActionButton({ title, onPress, kind = 'primary', disabled = false }: { title: string; onPress: () => void; kind?: 'primary' | 'secondary'; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.button, kind === 'secondary' && styles.buttonSecondary, disabled && styles.buttonDisabled]} onPress={onPress} disabled={disabled} activeOpacity={0.86}>
      <Text style={[styles.buttonText, kind === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>
    </TouchableOpacity>
  );
}

function HeroBanner({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroBlobA} />
      <View style={styles.heroBlobB} />
      <Text style={styles.heroEyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
      {children}
    </View>
  );
}

function MetricTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.metricTile, accent && styles.metricTileAccent]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionHint}>{children}</Text>;
}

function QueryFeedback({ loading, error, emptyMessage }: { loading?: boolean; error?: boolean; emptyMessage?: string }) {
  if (loading) return <ActivityIndicator style={styles.queryLoader} color={THEME.teal} />;
  if (error) return <Text style={styles.errorText}>{emptyMessage ?? 'Something went wrong.'}</Text>;
  return null;
}

function CategoryGrid({ categories, selectedCode, onSelect, language }: { categories: Category[]; selectedCode: string | string[]; onSelect: (code: string) => void; language: LanguageCode }) {
  const selectedCodes = Array.isArray(selectedCode) ? selectedCode : [selectedCode];
  return (
    <View style={styles.categoryGrid}>
      {categories.map((category) => {
        const active = selectedCodes.includes(category.code);
        return (
          <TouchableOpacity key={category.id ?? category.code} style={[styles.categoryCard, active && styles.categoryCardActive]} onPress={() => onSelect(category.code)} activeOpacity={0.88}>
            <Text style={styles.categoryIcon}>{categoryIcon(category)}</Text>
            <Text style={[styles.categoryTitle, active && styles.categoryTitleActive]}>{formatCategoryLabel(category.code || category.name, language)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AuthScreen() {
  const { t, language } = useI18n();
  const signIn = useSessionStore((state) => state.signIn);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('customer@fixcart.app');
  const [password, setPassword] = useState('Password@123');
  const [firstName, setFirstName] = useState('Rahul');
  const [lastName, setLastName] = useState('Sharma');
  const [phone, setPhone] = useState('9999999999');
  const [role, setRole] = useState<'CUSTOMER' | 'WORKER'>('CUSTOMER');
  const [workerCategoryCodes, setWorkerCategoryCodes] = useState<string[]>(['PLUMBING']);
  const categoryQuery = useQuery({ queryKey: ['public-categories'], queryFn: api.categories });
  const workerCategoryOptions = useMemo(() => orderedCategories(categoryQuery.data), [categoryQuery.data]);
  const workerPrimaryCategoryCode = workerCategoryCodes[0];
  const toggleWorkerCategory = (code: string) => {
    setWorkerCategoryCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  };
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.replace(/\D/g, '');
  const loginMutation = useMutation({ mutationFn: () => api.login({ email: normalizedEmail, password }), onSuccess: signIn, onError: (error: Error) => Alert.alert(t('loginFailed'), error.message) });
  const registerMutation = useMutation({
    mutationFn: () => api.register({
      email: normalizedEmail,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone,
      role,
      serviceCategoryCode: role === 'WORKER' ? workerPrimaryCategoryCode : undefined,
    }),
    onSuccess: signIn,
    onError: (error: Error) => Alert.alert(t('registrationFailed'), error.message),
  });
  const authBusy = loginMutation.isPending || registerMutation.isPending;
  const canSubmitRegister = !(mode === 'register' && role === 'WORKER' && workerCategoryCodes.length === 0);
  const validateAuthForm = () => {
    if (authBusy) {
      Alert.alert(t('loginFailed'), t('authBusy'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert(mode === 'login' ? t('loginFailed') : t('registrationFailed'), t('invalidEmail'));
      return false;
    }
    if (password.trim().length < 8) {
      Alert.alert(mode === 'login' ? t('loginFailed') : t('registrationFailed'), t('invalidPassword'));
      return false;
    }
    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert(t('registrationFailed'), t('missingName'));
        return false;
      }
      if (normalizedPhone.length !== 10) {
        Alert.alert(t('registrationFailed'), t('invalidPhone'));
        return false;
      }
      if (role === 'WORKER' && workerCategoryCodes.length === 0) {
        Alert.alert(t('registrationFailed'), t('workerCategoryHint'));
        return false;
      }
    }
    return true;
  };
  const handleAuthSubmit = () => {
    if (!validateAuthForm()) return;
    if (mode === 'login') {
      loginMutation.mutate();
      return;
    }
    registerMutation.mutate();
  };

  return (
    <ScreenFrame contentContainerStyle={styles.authWrap}>
        <AnimatedSection>
          <HeroBanner eyebrow={t('themeComfort')} title={t('loginHeroTitle')} subtitle={t('loginHeroSubtitle')}>
            <FixCartLogo caption={t('logoCaption')} />
          </HeroBanner>
        </AnimatedSection>
        <AnimatedSection delay={80}><LanguageSwitcher /></AnimatedSection>
        <AnimatedSection delay={140}>
          <View style={styles.authCard}>
            <View style={styles.segmentRow}>
              <TouchableOpacity style={[styles.segment, mode === 'login' && styles.segmentActive]} onPress={() => setMode('login')} disabled={authBusy}><Text style={styles.segmentText}>{t('login')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segment, mode === 'register' && styles.segmentActive]} onPress={() => setMode('register')} disabled={authBusy}><Text style={styles.segmentText}>{t('register')}</Text></TouchableOpacity>
            </View>
            {mode === 'register' ? (
              <>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder={t('firstName')} placeholderTextColor={THEME.muted} returnKeyType="next" editable={!authBusy} maxLength={40} />
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder={t('lastName')} placeholderTextColor={THEME.muted} returnKeyType="next" editable={!authBusy} maxLength={40} />
                <TextInput style={styles.input} value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, ''))} placeholder={t('phone')} placeholderTextColor={THEME.muted} keyboardType="phone-pad" returnKeyType="next" editable={!authBusy} maxLength={10} />
                <View style={styles.segmentRow}>
                  <TouchableOpacity style={[styles.segment, role === 'CUSTOMER' && styles.segmentActive]} onPress={() => setRole('CUSTOMER')} disabled={authBusy}><Text style={styles.segmentText}>{t('customer')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.segment, role === 'WORKER' && styles.segmentActive]} onPress={() => setRole('WORKER')} disabled={authBusy}><Text style={styles.segmentText}>{t('worker')}</Text></TouchableOpacity>
                </View>
                {role === 'WORKER' ? (
                  <View style={styles.workerCategoryBlock}>
                    <Text style={styles.languageLabel}>{t('workerCategorySetup')}</Text>
                    <SectionHint>{t('workerCategoryHint')}</SectionHint>
                    <CategoryGrid categories={workerCategoryOptions} selectedCode={workerCategoryCodes} onSelect={toggleWorkerCategory} language={language} />
                  </View>
                ) : null}
              </>
            ) : null}
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={t('email')} placeholderTextColor={THEME.muted} autoCapitalize="none" keyboardType="email-address" returnKeyType="next" editable={!authBusy} autoCorrect={false} />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={t('password')} placeholderTextColor={THEME.muted} secureTextEntry returnKeyType="done" editable={!authBusy} autoCorrect={false} />
            <ActionButton title={mode === 'login' ? t('continue') : t('createAccount')} onPress={handleAuthSubmit} disabled={authBusy || !canSubmitRegister} />
            {authBusy ? <ActivityIndicator style={styles.loader} color={THEME.teal} /> : null}
            <Text style={styles.demoText}>{t('demoAccounts')}: customer@fixcart.app / Password@123 and worker@fixcart.app / Password@123</Text>
          </View>
        </AnimatedSection>
    </ScreenFrame>
  );
}
function WorkerCardView({ worker, language, currency, t, isSaved = false, onToggleSaved }: { worker: WorkerCard; language: LanguageCode; currency: CurrencyCode; t: (key: TranslationKey) => string; isSaved?: boolean; onToggleSaved?: () => void }) {
  const signals = [
    worker.rating >= 4.5 ? t('topRated') : null,
    worker.distanceKm !== null && worker.distanceKm !== undefined && worker.distanceKm <= 3 ? t('nearby') : null,
    worker.basePrice <= 500 ? t('affordableStart') : null,
    worker.available ? t('availableNow') : null,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {worker.recommendationScore ? <View style={styles.badge}><Text style={styles.badgeText}>{t('bestMatch')} | {(worker.recommendationScore * 100).toFixed(0)}%</Text></View> : <View />}
        {onToggleSaved ? <ActionButton title={isSaved ? t('saved') : t('save')} onPress={onToggleSaved} kind="secondary" /> : null}
      </View>
      <Text style={styles.cardTitle}>{worker.name}</Text>
      <Text style={styles.cardMeta}>{formatCategoryLabel(worker.category, language)} | {worker.experienceYears} {t('yearsExperience')}</Text>
      <Text style={styles.cardMeta}>{t('ratingLabel')} {worker.rating?.toFixed?.(1) ?? worker.rating}/5 | {worker.totalReviews ?? 0} {t('verifiedReviews')} | {t('startsAt')} {formatCurrency(worker.basePrice, language, currency, t)}</Text>
      <View style={styles.pillRow}>
        {signals.map((signal) => <View key={signal} style={styles.pill}><Text style={styles.pillText}>{signal}</Text></View>)}
      </View>
      <Text style={styles.cardMeta}>{t('hourly')}: {formatCurrency(worker.hourlyRate, language, currency, t)} | {t('distance')}: {worker.distanceKm ? `${worker.distanceKm.toFixed(1)} km` : t('notAvailable')}</Text>
      {worker.recommendationExplanation ? <Text style={styles.cardBody}>{worker.recommendationExplanation}</Text> : null}
      <Text style={styles.cardBody}>{worker.bio}</Text>
    </View>
  );
}

function NearbyWorkersMap({ workers, selectedWorkerId, onSelectWorker, savedWorkerIds, onToggleSaved, language, currency, t }: { workers: WorkerCard[]; selectedWorkerId: string | null; onSelectWorker: (workerId: string) => void; savedWorkerIds: Set<string>; onToggleSaved: (workerId: string) => void; language: LanguageCode; currency: CurrencyCode; t: (key: TranslationKey) => string }) {
  const selectedWorker = workers.find((worker) => worker.workerId === selectedWorkerId) ?? workers[0] ?? null;
  const region = selectedWorker ? { latitude: selectedWorker.latitude, longitude: selectedWorker.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 } : DEFAULT_MAP_REGION;
  if (!workers.length) return <SectionHint>{t('nearbyWorkersListHint')}</SectionHint>;
  return (
    <View style={styles.mapBlock}>
      {ENABLE_NATIVE_MAPS ? (
        <View style={styles.mapWrap}>
          <MapView style={styles.map} region={region}>
            {workers.map((worker) => (
              <Marker key={worker.workerId} coordinate={{ latitude: worker.latitude, longitude: worker.longitude }} title={worker.name} description={`${formatCategoryLabel(worker.category, language)} | ${formatCurrency(worker.basePrice, language, currency, t)}`} pinColor={worker.workerId === selectedWorker?.workerId ? THEME.amber : THEME.teal} onPress={() => onSelectWorker(worker.workerId)} />
            ))}
          </MapView>
        </View>
      ) : (
        <View style={styles.mapFallbackCard}>
          <Text style={styles.mapFallbackTitle}>{t('nearbyWorkersMapHint')}</Text>
          <Text style={styles.sectionHint}>{t('nearbyWorkersListHint')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapFallbackRow}>
            {workers.map((worker) => {
              const selected = worker.workerId === selectedWorker?.workerId;
              return (
                <TouchableOpacity key={worker.workerId} style={[styles.horizontalCard, styles.card, selected && styles.horizontalCardSelected]} onPress={() => onSelectWorker(worker.workerId)} activeOpacity={0.9}>
                  <WorkerCardView worker={worker} language={language} currency={currency} t={t} isSaved={savedWorkerIds.has(worker.workerId)} onToggleSaved={() => onToggleSaved(worker.workerId)} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      {selectedWorker ? (
        <>
          <WorkerCardView worker={selectedWorker} language={language} currency={currency} t={t} isSaved={savedWorkerIds.has(selectedWorker.workerId)} onToggleSaved={() => onToggleSaved(selectedWorker.workerId)} />
          <ActionButton title={t('openDirections')} onPress={() => void openDirections(selectedWorker.latitude, selectedWorker.longitude, t('mapUnavailable'))} kind="secondary" />
        </>
      ) : null}
    </View>
  );
}

function StatusTimeline({ booking, language }: { booking: Booking; language: LanguageCode }) {
  return (
    <View style={styles.timelineWrap}>
      {booking.history.map((item) => (
        <View key={item.id} style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine}>
            <Text style={styles.timelineTitle}>{formatStatus(item.status, language)}</Text>
            <Text style={styles.timelineMeta}>{formatDate(item.createdAt, language)}</Text>
            {item.note ? <Text style={styles.timelineMeta}>{item.note}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function BookingCard({ booking, language, currency, t, onChat, onSelect, onReview, onRebook }: { booking: Booking; language: LanguageCode; currency: CurrencyCode; t: (key: TranslationKey) => string; onChat?: () => void; onSelect?: () => void; onReview?: () => void; onRebook?: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{booking.title}</Text>
      <Text style={styles.cardMeta}>{formatCategoryLabel(booking.category, language)} | {formatStatus(booking.status, language)}</Text>
      <Text style={styles.cardMeta}>{t('budget')}: {formatCurrency(booking.budget, language, currency, t)} | {t('expectedHours')}: {booking.expectedDurationHours}h</Text>
      <Text style={styles.cardMeta}>{t('preferredTime')}: {formatDate(booking.preferredTime, language)}</Text>
      <Text style={styles.cardMeta}>{t('address')}: {booking.address}</Text>
      {booking.workerName ? <Text style={styles.cardMeta}>{t('assignedWorker')}: {booking.workerName}</Text> : null}
      {booking.matchExplanation ? <Text style={styles.cardBody}>{booking.matchExplanation}</Text> : null}
      <View style={styles.actionRow}>
        {onSelect ? <ActionButton title={t('details')} onPress={onSelect} kind="secondary" /> : null}
        {onChat ? <ActionButton title={t('chat')} onPress={onChat} kind="secondary" /> : null}
        {onReview ? <ActionButton title={t('review')} onPress={onReview} kind="secondary" /> : null}
        {onRebook ? <ActionButton title={t('rebook')} onPress={onRebook} kind="secondary" /> : null}
      </View>
    </View>
  );
}

function BookingActions({ actions, language, t, onStatus }: { actions: BookingStatus[]; language: LanguageCode; t: (key: TranslationKey) => string; onStatus: (status: BookingStatus) => void }) {
  if (!actions.length) return <SectionHint>{t('noNextAction')}</SectionHint>;
  return <View style={styles.actionRow}>{actions.map((status) => <ActionButton key={status} title={formatStatus(status, language)} onPress={() => onStatus(status)} kind="secondary" />)}</View>;
}

function RatingPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <View style={styles.actionRow}>{[1, 2, 3, 4, 5].map((item) => <TouchableOpacity key={item} style={[styles.ratingChip, String(item) === value && styles.ratingChipActive]} onPress={() => onChange(String(item))}><Text style={styles.ratingChipText}>{item} / 5</Text></TouchableOpacity>)}</View>;
}

function ExistingReviewCard({ review, language, t }: { review: Review; language: LanguageCode; t: (key: TranslationKey) => string }) {
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.cardTitle}>{t('reviewSubmitted')}</Text>
      <Text style={styles.cardMeta}>{t('ratingLabel')}: {review.rating}/5</Text>
      <Text style={styles.cardBody}>{review.comment}</Text>
      <Text style={styles.timelineMeta}>{formatDate(review.createdAt, language)}</Text>
    </View>
  );
}

function ChatPanel({ token, bookingId, t, language }: { token: string; bookingId: string; t: (key: TranslationKey) => string; language: LanguageCode }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [assistantReply, setAssistantReply] = useState('');
  const roomQuery = useQuery({ queryKey: ['chat', bookingId], queryFn: () => api.chatRoom(token, bookingId), refetchInterval: REFRESH_INTERVAL_MS });
  const sendMutation = useMutation({
    mutationFn: async () => api.sendMessage(token, bookingId, message),
    onSuccess: async () => { setMessage(''); await queryClient.invalidateQueries({ queryKey: ['chat', bookingId] }); },
    onError: (error: Error) => Alert.alert(t('messageFailed'), error.message),
  });
  const assistantMutation = useMutation({
    mutationFn: async () => api.askBookingAssistant(token, bookingId, message),
    onSuccess: (response) => { setAssistantReply(response.answer || t('noAiReply')); },
    onError: (error: Error) => Alert.alert(t('askAi'), error.message),
  });
  if (roomQuery.isLoading) return <ActivityIndicator color={THEME.teal} />;
  if (roomQuery.isError) return <Text style={styles.errorText}>{t('chatUnavailable')}</Text>;
  return (
    <View style={styles.chatPanel}>
      <View style={styles.chatMessages}>
        {roomQuery.data?.messages.length ? roomQuery.data.messages.map((item) => (
          <View key={item.id} style={styles.chatBubble}>
            <Text style={styles.chatSender}>{item.senderName}</Text>
            <Text style={styles.cardBody}>{item.message}</Text>
            <Text style={styles.timelineMeta}>{formatDate(item.sentAt, language)}</Text>
          </View>
        )) : <SectionHint>{t('noMessagesYet')}</SectionHint>}
      </View>
      <TextInput style={[styles.input, styles.chatInput]} value={message} onChangeText={setMessage} placeholder={t('message')} placeholderTextColor={THEME.muted} multiline />
      <View style={styles.actionRow}>
        <ActionButton title={sendMutation.isPending ? t('sending') : t('send')} onPress={() => sendMutation.mutate()} disabled={!message.trim() || sendMutation.isPending} />
        <ActionButton title={assistantMutation.isPending ? t('aiWorking') : t('askAi')} onPress={() => assistantMutation.mutate()} disabled={!message.trim() || assistantMutation.isPending} kind="secondary" />
      </View>
      {assistantReply ? <View style={styles.assistantAnswerCard}><Text style={styles.subTitle}>{t('aiReply')}</Text><Text style={styles.cardBody}>{assistantReply}</Text></View> : null}
    </View>
  );
}

function SupportAssistantCard({ token, t }: { token: string; t: (key: TranslationKey) => string }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const supportMutation = useMutation({
    mutationFn: async () => api.askSupportAssistant(token, question),
    onSuccess: (response) => { setAnswer(response.answer || t('noAiReply')); },
    onError: (error: Error) => Alert.alert(t('supportAssistant'), error.message),
  });

  return (
    <View style={styles.supportCard}>
      <TextInput style={[styles.input, styles.textArea]} value={question} onChangeText={setQuestion} placeholder={t('supportPlaceholder')} placeholderTextColor={THEME.muted} multiline />
      <ActionButton title={supportMutation.isPending ? t('aiWorking') : t('askAi')} onPress={() => supportMutation.mutate()} disabled={!question.trim() || supportMutation.isPending} kind="secondary" />
      {answer ? <View style={styles.assistantAnswerCard}><Text style={styles.subTitle}>{t('aiReply')}</Text><Text style={styles.cardBody}>{answer}</Text></View> : null}
    </View>
  );
}

function RoutePreview({ booking, t, language }: { booking: Booking; t: (key: TranslationKey) => string; language: LanguageCode }) {
  return (
    <View style={styles.routeCard}>
      <SectionHint>{t('workerRouteMapHint')}</SectionHint>
      {ENABLE_NATIVE_MAPS ? (
        <View style={styles.routeMapWrap}>
          <MapView style={styles.routeMap} region={{ latitude: booking.latitude, longitude: booking.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
            <Marker coordinate={{ latitude: booking.latitude, longitude: booking.longitude }} title={booking.customerName} description={booking.address} />
          </MapView>
        </View>
      ) : (
        <View style={styles.routeFallbackCard}>
          <Text style={styles.cardTitle}>{booking.customerName}</Text>
          <Text style={styles.cardMeta}>{booking.address}</Text>
          <Text style={styles.cardMeta}>{t('preferredTime')}: {formatDate(booking.preferredTime, language)}</Text>
        </View>
      )}
      <ActionButton title={t('openDirections')} onPress={() => void openDirections(booking.latitude, booking.longitude, t('mapUnavailable'))} />
    </View>
  );
}
function CustomerDashboard() {
  const { language, currency, t } = useI18n();
  const token = useSessionStore((state) => state.accessToken)!;
  const signOut = useSessionStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('PLUMBING');
  const [title, setTitle] = useState('Kitchen sink leakage');
  const [description, setDescription] = useState('Leak under the sink. Need a same-day fix if possible.');
  const [budget, setBudget] = useState('700');
  const [duration, setDuration] = useState('2');
  const [address, setAddress] = useState('Andheri East, Mumbai');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('Fast and reliable service.');
  const [reviewRating, setReviewRating] = useState('5');

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const workersQuery = useQuery({ queryKey: ['workers', selectedCategory, budget], queryFn: () => api.discoverWorkers({ categoryCode: selectedCategory, latitude: 19.076, longitude: 72.8777, maxBudget: Number(budget) || undefined }), refetchInterval: REFRESH_INTERVAL_MS });
  const bookingsQuery = useQuery({ queryKey: ['customer-bookings'], queryFn: () => api.bookings(token), refetchInterval: REFRESH_INTERVAL_MS });
  const savedWorkersQuery = useQuery({ queryKey: ['saved-workers'], queryFn: () => api.savedWorkers(token), refetchInterval: REFRESH_INTERVAL_MS });

  const workers = workersQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const categories = orderedCategories(categoriesQuery.data);
  const savedWorkerIds = useMemo(() => new Set((savedWorkersQuery.data ?? []).map((item) => item.workerId)), [savedWorkersQuery.data]);
  const savedWorkersVisible = workers.filter((worker) => savedWorkerIds.has(worker.workerId));
  useEffect(() => {
    if (!workers.length) { setSelectedWorkerId(null); return; }
    setSelectedWorkerId((current) => (current && workers.some((worker) => worker.workerId === current) ? current : workers[0].workerId));
  }, [workers]);

  const createBookingMutation = useMutation({
    mutationFn: () => api.createBooking(token, { categoryCode: selectedCategory, title, description, budget: Number(budget), expectedDurationHours: Number(duration), preferredTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), address, latitude: 19.076, longitude: 72.8777, urgency: 'HIGH' }),
    onSuccess: async (booking) => { setSelectedBookingId(booking.bookingId); await queryClient.invalidateQueries({ queryKey: ['customer-bookings'] }); Alert.alert(t('requestCreatedTitle'), t('requestCreatedBody')); },
    onError: (error: Error) => Alert.alert(t('createBookingFailed'), error.message),
  });
  const updateStatusMutation = useMutation({ mutationFn: ({ bookingId, status }: { bookingId: string; status: BookingStatus }) => api.updateBookingStatus(token, bookingId, status), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['customer-bookings'] }); }, onError: (error: Error) => Alert.alert(t('statusUpdateFailed'), error.message) });
  const saveWorkerMutation = useMutation({ mutationFn: (workerId: string) => api.saveWorker(token, workerId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['saved-workers'] }); } });
  const removeSavedWorkerMutation = useMutation({ mutationFn: (workerId: string) => api.removeSavedWorker(token, workerId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['saved-workers'] }); } });
  const selectedBooking = bookings.find((booking) => booking.bookingId === selectedBookingId) ?? bookings[0] ?? null;
  const selectedActions = selectedBooking ? (CUSTOMER_STATUS_ACTIONS[selectedBooking.status] ?? []) : [];
  const reviewsQuery = useQuery({ queryKey: ['worker-reviews', selectedBooking?.workerId], queryFn: () => api.reviewsByWorker(selectedBooking!.workerId!), enabled: !!selectedBooking?.workerId, refetchInterval: REFRESH_INTERVAL_MS });
  const existingReview = useMemo(() => !selectedBooking || !reviewsQuery.data ? null : reviewsQuery.data.find((review) => review.bookingId === selectedBooking.bookingId) ?? null, [reviewsQuery.data, selectedBooking]);
  const reviewMutation = useMutation({ mutationFn: (bookingId: string) => api.createReview(token, bookingId, Number(reviewRating), reviewComment), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['customer-bookings'] }); await queryClient.invalidateQueries({ queryKey: ['worker-reviews', selectedBooking?.workerId] }); Alert.alert(t('reviewSubmitted'), t('reviewSubmittedBody')); }, onError: (error: Error) => Alert.alert(t('reviewFailed'), error.message) });
  const improveJobMutation = useMutation({ mutationFn: () => api.improveJobDraft(token, { categoryCode: selectedCategory, title, description, address, budget: Number(budget) || undefined, expectedHours: Number(duration) || undefined }), onSuccess: (response) => { setTitle(response.title); setDescription(response.description); if (response.checklist?.length) { Alert.alert(t('aiChecklist'), response.checklist.join('\n')); } }, onError: (error: Error) => Alert.alert(t('improveWithAi'), error.message) });
  const smartQuoteMutation = useMutation({ mutationFn: () => api.suggestJobQuote(token, { categoryCode: selectedCategory, title, description, expectedHours: Number(duration) || 1 }), onSuccess: (response) => { setBudget(String(response.suggestedBudget)); Alert.alert(t('smartQuote'), `${response.reasoning}` + '\n' + `Range: ${response.lowEstimate} - ${response.highEstimate}`); }, onError: (error: Error) => Alert.alert(t('suggestBudget'), error.message) });

  const customerRealtimeStatus = useStompSubscriptions(['/topic/bookings/open', ...(selectedBooking ? [`/topic/bookings/${selectedBooking.bookingId}`, `/topic/chat/${selectedBooking.bookingId}`] : [])], {
    '/topic/bookings/open': async () => { await queryClient.invalidateQueries({ queryKey: ['workers', selectedCategory, budget] }); await queryClient.invalidateQueries({ queryKey: ['customer-bookings'] }); },
    ...(selectedBooking ? {
      [`/topic/bookings/${selectedBooking.bookingId}`]: async () => { await queryClient.invalidateQueries({ queryKey: ['customer-bookings'] }); },
      [`/topic/chat/${selectedBooking.bookingId}`]: async () => { await queryClient.invalidateQueries({ queryKey: ['chat', selectedBooking.bookingId] }); },
    } : {}),
  }, true);

  const handleToggleSavedWorker = (workerId: string) => savedWorkerIds.has(workerId) ? removeSavedWorkerMutation.mutate(workerId) : saveWorkerMutation.mutate(workerId);
  const handleRebook = (booking: Booking) => {
    const match = (categoriesQuery.data ?? []).find((category) => category.code.toUpperCase() === booking.category.toUpperCase() || category.name.toUpperCase() === booking.category.toUpperCase());
    if (match) setSelectedCategory(match.code);
    setTitle(`${booking.title} - Repeat booking`);
    setDescription(booking.description);
    setBudget(String(booking.budget));
    setDuration(String(booking.expectedDurationHours));
    setAddress(booking.address);
    Alert.alert(t('rebookingReadyTitle'), t('rebookingReadyBody'));
  };

  return (
    <ScreenFrame>
        <AnimatedSection>
          <View style={styles.headerCard}><View style={styles.headerBlock}><FixCartLogo compact /><Text style={styles.headerTitle}>{t('customerDashboard')}</Text></View><ActionButton title={t('logout')} onPress={() => void signOut()} kind="secondary" /></View>
          <Text style={styles.liveStatus}>{t('liveUpdates')}: {realtimeLabel(customerRealtimeStatus, t)}</Text>
        </AnimatedSection>
        <AnimatedSection delay={60}><LanguageSwitcher /></AnimatedSection>
        <AnimatedSection delay={100}><HeroBanner eyebrow={t('quickBooking')} title={t('quickBookingTitle')} subtitle={t('quickBookingSubtitle')}><View style={styles.metricGrid}><MetricTile label={t('nearbyWorkers')} value={String(workers.length)} accent /><MetricTile label={t('savedWorkers')} value={String(savedWorkerIds.size)} /><MetricTile label={t('activeBookings')} value={String(bookings.length)} /></View></HeroBanner></AnimatedSection>
        <AnimatedSection delay={120}><Section title={t('category')}><SectionHint>{t('quickBookingSubtitle')}</SectionHint><CategoryGrid categories={categories} selectedCode={selectedCategory} onSelect={setSelectedCategory} language={language} /></Section></AnimatedSection>
        {workers[0] ? <AnimatedSection delay={130}><Section title={t('topRecommendedWorker')}><SectionHint>{t('topRecommendedHint')}</SectionHint><WorkerCardView worker={workers[0]} language={language} currency={currency} t={t} isSaved={savedWorkerIds.has(workers[0].workerId)} onToggleSaved={() => handleToggleSavedWorker(workers[0].workerId)} /></Section></AnimatedSection> : null}
        <AnimatedSection delay={160}><Section title={t('savedWorkersTitle')}>{savedWorkersVisible.length ? savedWorkersVisible.map((worker) => <WorkerCardView key={worker.workerId} worker={worker} language={language} currency={currency} t={t} isSaved onToggleSaved={() => handleToggleSavedWorker(worker.workerId)} />) : <SectionHint>{t('savedWorkersHint')}</SectionHint>}</Section></AnimatedSection>
        <AnimatedSection delay={190}><Section title={t('nearbyWorkersMap')}><SectionHint>{t('nearbyWorkersMapHint')}</SectionHint><QueryFeedback loading={workersQuery.isLoading} error={workersQuery.isError} emptyMessage={t('nearbyWorkersListHint')} /><NearbyWorkersMap workers={workers} selectedWorkerId={selectedWorkerId} onSelectWorker={setSelectedWorkerId} savedWorkerIds={savedWorkerIds} onToggleSaved={handleToggleSavedWorker} language={language} currency={currency} t={t} /></Section></AnimatedSection>
        <AnimatedSection delay={220}><Section title={t('nearbyWorkers')}><SectionHint>{t('nearbyWorkersListHint')}</SectionHint><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>{workers.map((worker) => <TouchableOpacity key={worker.workerId} style={[styles.horizontalCard, selectedWorkerId === worker.workerId && styles.horizontalCardSelected]} onPress={() => setSelectedWorkerId(worker.workerId)} activeOpacity={0.9}><WorkerCardView worker={worker} language={language} currency={currency} t={t} isSaved={savedWorkerIds.has(worker.workerId)} onToggleSaved={() => handleToggleSavedWorker(worker.workerId)} /></TouchableOpacity>)}</ScrollView></Section></AnimatedSection>
        <AnimatedSection delay={250}><Section title={t('createServiceRequest')}><Text style={styles.label}>{t('category')}</Text><CategoryGrid categories={categories} selectedCode={selectedCategory} onSelect={setSelectedCategory} language={language} /><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t('jobTitle')} placeholderTextColor={THEME.muted} returnKeyType="next" /><TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={t('describeIssue')} placeholderTextColor={THEME.muted} multiline /><View style={styles.actionRow}><ActionButton title={improveJobMutation.isPending ? t('aiWorking') : t('improveWithAi')} onPress={() => improveJobMutation.mutate()} disabled={improveJobMutation.isPending || !title.trim() || !description.trim()} kind="secondary" /><ActionButton title={smartQuoteMutation.isPending ? t('aiWorking') : t('suggestBudget')} onPress={() => smartQuoteMutation.mutate()} disabled={smartQuoteMutation.isPending || !title.trim() || !description.trim()} kind="secondary" /></View><View style={styles.compactFieldRow}><TextInput style={[styles.input, styles.compactField]} value={budget} onChangeText={setBudget} placeholder={`${t('budget')} (${currency})`} placeholderTextColor={THEME.muted} keyboardType="numeric" returnKeyType="next" /><TextInput style={[styles.input, styles.compactField]} value={duration} onChangeText={setDuration} placeholder={t('expectedHours')} placeholderTextColor={THEME.muted} keyboardType="numeric" returnKeyType="next" /></View><TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={t('address')} placeholderTextColor={THEME.muted} /><ActionButton title={createBookingMutation.isPending ? t('broadcasting') : t('broadcastRequest')} onPress={() => createBookingMutation.mutate()} disabled={createBookingMutation.isPending} /></Section></AnimatedSection>
        <AnimatedSection delay={280}><Section title={t('myBookings')}>{bookings.length ? bookings.map((booking) => <BookingCard key={booking.bookingId} booking={booking} language={language} currency={currency} t={t} onSelect={() => setSelectedBookingId(booking.bookingId)} onChat={booking.workerId ? () => setSelectedBookingId(booking.bookingId) : undefined} onReview={booking.status === 'COMPLETED' ? () => setSelectedBookingId(booking.bookingId) : undefined} onRebook={booking.status === 'COMPLETED' ? () => handleRebook(booking) : undefined} />) : <SectionHint>{t('noBookingsYet')}</SectionHint>}</Section></AnimatedSection>
        {selectedBooking ? <AnimatedSection delay={310}><Section title={t('selectedBookingDetails')}><Text style={styles.cardTitle}>{selectedBooking.title}</Text><Text style={styles.cardMeta}>{formatStatus(selectedBooking.status, language)}</Text><Text style={styles.cardBody}>{selectedBooking.description}</Text><Text style={styles.cardMeta}>{t('preferredTime')}: {formatDate(selectedBooking.preferredTime, language)}</Text><Text style={styles.cardMeta}>{t('budget')}: {formatCurrency(selectedBooking.budget, language, currency, t)}</Text>{selectedBooking.workerName ? <Text style={styles.cardMeta}>{t('workerLabel')}: {selectedBooking.workerName}</Text> : null}<SectionHint>{t('customerActionsHint')}</SectionHint><BookingActions actions={selectedActions} language={language} t={t} onStatus={(status) => updateStatusMutation.mutate({ bookingId: selectedBooking.bookingId, status })} /><Text style={styles.subTitle}>{t('statusHistory')}</Text><StatusTimeline booking={selectedBooking} language={language} /></Section></AnimatedSection> : null}
        {selectedBooking?.workerId ? <AnimatedSection delay={340}><Section title={`${t('chat')}: ${selectedBooking.title}`}><ChatPanel token={token} bookingId={selectedBooking.bookingId} t={t} language={language} /></Section></AnimatedSection> : null}
        {selectedBooking?.status === 'COMPLETED' && existingReview ? <AnimatedSection delay={370}><Section title={t('yourSubmittedReview')}><ExistingReviewCard review={existingReview} language={language} t={t} /></Section></AnimatedSection> : null}
        <AnimatedSection delay={395}><Section title={t('supportAssistant')}><SupportAssistantCard token={token} t={t} /></Section></AnimatedSection>
        {selectedBooking?.status === 'COMPLETED' && !existingReview ? <AnimatedSection delay={400}><Section title={t('completeWithReview')}><Text style={styles.label}>{t('selectRating')}</Text><RatingPicker value={reviewRating} onChange={setReviewRating} /><TextInput style={[styles.input, styles.textArea]} value={reviewComment} onChangeText={setReviewComment} placeholder={t('review')} placeholderTextColor={THEME.muted} multiline /><ActionButton title={reviewMutation.isPending ? t('sending') : t('submitReview')} onPress={() => reviewMutation.mutate(selectedBooking.bookingId)} disabled={reviewMutation.isPending} /></Section></AnimatedSection> : null}
    </ScreenFrame>
  );
}

function realtimeLabel(status: ReturnType<typeof useStompSubscriptions>, t: (key: TranslationKey) => string) {
  if (status === 'connected') return t('connected');
  if (status === 'connecting') return t('connecting');
  if (status === 'reconnecting') return t('reconnecting');
  if (status === 'error') return t('error');
  return t('disconnected');
}

function WorkerDashboard() {
  const { language, currency, t } = useI18n();
  const token = useSessionStore((state) => state.accessToken)!;
  const signOut = useSessionStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bio, setBio] = useState('Reliable professional focused on quick turnaround and clean service.');
  const [basePrice, setBasePrice] = useState('399');
  const [hourlyRate, setHourlyRate] = useState('299');
  const profileQuery = useQuery({ queryKey: ['worker-profile'], queryFn: () => api.workerProfile(token), refetchInterval: REFRESH_INTERVAL_MS });
  const openBookingsQuery = useQuery({ queryKey: ['open-bookings'], queryFn: () => api.openBookings(token), refetchInterval: REFRESH_INTERVAL_MS });
  const bookingsQuery = useQuery({ queryKey: ['worker-bookings'], queryFn: () => api.bookings(token), refetchInterval: REFRESH_INTERVAL_MS });
  useEffect(() => {
    const worker = (profileQuery.data as { worker?: { bio?: string; basePrice?: number; hourlyRate?: number } } | undefined)?.worker;
    if (worker) { setBio(worker.bio ?? ''); setBasePrice(String(worker.basePrice ?? '')); setHourlyRate(String(worker.hourlyRate ?? '')); }
  }, [profileQuery.data]);
  const updateProfileMutation = useMutation({ mutationFn: () => api.updateWorkerProfile(token, { bio, primaryCategoryCode: workerCategoryCode, experienceYears: 6, basePrice: Number(basePrice), hourlyRate: Number(hourlyRate), latitude: 19.076, longitude: 72.8777, serviceRadiusKm: 20, available: true, availability: [{ dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00' }, { dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '18:00:00' }, { dayOfWeek: 'SATURDAY', startTime: '09:00:00', endTime: '18:00:00' }] }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['worker-profile'] }); Alert.alert(t('profileUpdated')); } });
  const acceptMutation = useMutation({ mutationFn: (bookingId: string) => api.acceptBooking(token, bookingId), onSuccess: async (booking) => { setSelectedBookingId(booking.bookingId); await queryClient.invalidateQueries({ queryKey: ['open-bookings'] }); await queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); } });
  const statusMutation = useMutation({ mutationFn: ({ bookingId, status }: { bookingId: string; status: BookingStatus }) => api.updateBookingStatus(token, bookingId, status), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); } });
  const activeBookings = bookingsQuery.data ?? [];
  const completedBookings = activeBookings.filter((booking) => booking.status === 'COMPLETED');
  const workerCategoryCode = (profileQuery.data as { worker?: { category?: string } } | undefined)?.worker?.category?.toUpperCase?.() ?? 'PLUMBING';
  const netEarned = completedBookings.reduce((sum, booking) => sum + Number(booking.workerPayout ?? Math.max(0, booking.budget - (booking.platformFee ?? 0))), 0);
  const platformGenerated = completedBookings.reduce((sum, booking) => sum + Number(booking.platformFee ?? 0), 0);
  const selectedBooking = activeBookings.find((booking) => booking.bookingId === selectedBookingId) ?? activeBookings[0] ?? null;
  const selectedActions = selectedBooking ? (WORKER_STATUS_ACTIONS[selectedBooking.status] ?? []) : [];
  const workerRealtimeStatus = useStompSubscriptions(['/topic/bookings/open', ...(selectedBooking ? [`/topic/bookings/${selectedBooking.bookingId}`, `/topic/chat/${selectedBooking.bookingId}`] : [])], { '/topic/bookings/open': async () => { await queryClient.invalidateQueries({ queryKey: ['open-bookings'] }); }, ...(selectedBooking ? { [`/topic/bookings/${selectedBooking.bookingId}`]: async () => { await queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); await queryClient.invalidateQueries({ queryKey: ['open-bookings'] }); }, [`/topic/chat/${selectedBooking.bookingId}`]: async () => { await queryClient.invalidateQueries({ queryKey: ['chat', selectedBooking.bookingId] }); } } : {}) }, true);

  return (
    <ScreenFrame>
        <AnimatedSection><View style={styles.headerCard}><View style={styles.headerBlock}><FixCartLogo compact /><Text style={styles.headerTitle}>{t('workerDashboard')}</Text></View><ActionButton title={t('logout')} onPress={() => void signOut()} kind="secondary" /></View><Text style={styles.liveStatus}>{t('liveUpdates')}: {realtimeLabel(workerRealtimeStatus, t)}</Text></AnimatedSection>
        <AnimatedSection delay={60}><LanguageSwitcher /></AnimatedSection>
        <AnimatedSection delay={100}><HeroBanner eyebrow={t('revenueFocus')} title={t('revenueTitle')} subtitle={t('revenueSubtitle')}><View style={styles.metricGrid}><MetricTile label={t('openJobs')} value={String((openBookingsQuery.data ?? []).length)} accent /><MetricTile label={t('netEarned')} value={formatCurrency(netEarned, language, currency, t)} /><MetricTile label={t('completedJobs')} value={String(completedBookings.length)} /></View></HeroBanner></AnimatedSection>
        <AnimatedSection delay={130}><Section title={t('profilePricing')}><SectionHint>{t('pricingHint')}</SectionHint><View style={styles.infoStrip}><Text style={styles.infoStripLabel}>{formatCategoryLabel(workerCategoryCode, language)}</Text><Text style={styles.infoStripValue}>{t('availableNow')}</Text></View><TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder={t('bio')} placeholderTextColor={THEME.muted} multiline /><View style={styles.compactFieldRow}><TextInput style={[styles.input, styles.compactField]} value={basePrice} onChangeText={setBasePrice} placeholder={`${t('basePrice')} (${currency})`} placeholderTextColor={THEME.muted} keyboardType="numeric" /><TextInput style={[styles.input, styles.compactField]} value={hourlyRate} onChangeText={setHourlyRate} placeholder={`${t('hourly')} (${currency})`} placeholderTextColor={THEME.muted} keyboardType="numeric" /></View><ActionButton title={updateProfileMutation.isPending ? t('saving') : t('saveProfile')} onPress={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} /></Section></AnimatedSection>
        <AnimatedSection delay={160}><Section title={t('earningsSummary')}><SectionHint>{t('earningsHint')}</SectionHint><View style={styles.metricGrid}><MetricTile label={t('netPayout')} value={formatCurrency(netEarned, language, currency, t)} accent /><MetricTile label={t('platformFee')} value={formatCurrency(platformGenerated, language, currency, t)} /><MetricTile label={t('completedJobs')} value={String(completedBookings.length)} /></View></Section></AnimatedSection>
        <AnimatedSection delay={190}><Section title={t('recommendedOpenJobs')}><QueryFeedback loading={openBookingsQuery.isLoading} error={openBookingsQuery.isError} emptyMessage={t('noOpenJobs')} />{(openBookingsQuery.data ?? []).length ? (openBookingsQuery.data ?? []).map((booking) => <View key={booking.bookingId}><BookingCard booking={booking} language={language} currency={currency} t={t} onSelect={() => setSelectedBookingId(booking.bookingId)} /><ActionButton title={`${t('acceptJob')} ${booking.title}`} onPress={() => acceptMutation.mutate(booking.bookingId)} /></View>) : <SectionHint>{t('noOpenJobs')}</SectionHint>}</Section></AnimatedSection>
        <AnimatedSection delay={220}><Section title={t('myActiveWork')}>{activeBookings.length ? activeBookings.map((booking) => <BookingCard key={booking.bookingId} booking={booking} language={language} currency={currency} t={t} onSelect={() => setSelectedBookingId(booking.bookingId)} onChat={() => setSelectedBookingId(booking.bookingId)} />) : <SectionHint>{t('noAcceptedJobs')}</SectionHint>}</Section></AnimatedSection>
        {selectedBooking ? <AnimatedSection delay={250}><Section title={t('selectedWorkDetails')}><Text style={styles.cardTitle}>{selectedBooking.title}</Text><Text style={styles.cardMeta}>{selectedBooking.customerName}</Text><Text style={styles.cardBody}>{selectedBooking.description}</Text><Text style={styles.cardMeta}>{t('address')}: {selectedBooking.address}</Text><Text style={styles.cardMeta}>{t('budget')}: {formatCurrency(selectedBooking.budget, language, currency, t)}</Text><Text style={styles.subTitle}>{t('workerRouteMap')}</Text><RoutePreview booking={selectedBooking} t={t} language={language} /><BookingActions actions={selectedActions} language={language} t={t} onStatus={(status) => statusMutation.mutate({ bookingId: selectedBooking.bookingId, status })} /><Text style={styles.subTitle}>{t('statusHistory')}</Text><StatusTimeline booking={selectedBooking} language={language} /></Section></AnimatedSection> : null}
        {selectedBooking ? <AnimatedSection delay={280}><Section title={`${t('chat')}: ${selectedBooking.title}`}><ChatPanel token={token} bookingId={selectedBooking.bookingId} t={t} language={language} /></Section></AnimatedSection> : null}
    </ScreenFrame>
  );
}

function Root() {
  const hydrateSession = useSessionStore((state) => state.hydrate);
  const sessionHydrated = useSessionStore((state) => state.hydrated);
  const user = useSessionStore((state) => state.user);
  const token = useSessionStore((state) => state.accessToken);
  const hydratePreferences = usePreferencesStore((state) => state.hydrate);
  const preferencesHydrated = usePreferencesStore((state) => state.hydrated);
  useEffect(() => { void hydrateSession(); void hydratePreferences(); }, [hydratePreferences, hydrateSession]);
  const meQuery = useQuery({ queryKey: ['me', token], queryFn: () => api.me(token!), enabled: !!token });
  const effectiveRole = useMemo(() => meQuery.data?.user.role ?? user?.role, [meQuery.data?.user.role, user?.role]);
  useEffect(() => {
    if (token && user?.id) {
      void syncPushRegistration(token, user.id);
    }
  }, [token, user?.id]);
  if (!sessionHydrated || !preferencesHydrated) return <SafeAreaView style={styles.centered}><ActivityIndicator color={THEME.teal} size="large" /></SafeAreaView>;
  if (!token || !effectiveRole) return <AuthScreen />;
  return effectiveRole === 'WORKER' ? <WorkerDashboard /> : <CustomerDashboard />;
}

function App() {
  return <QueryClientProvider client={queryClient}><StatusBar style="dark" /><Root /></QueryClientProvider>;
}

export default withErrorBoundary(App);
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  bgDecor: { ...StyleSheet.absoluteFillObject },
  bgBlobA: { position: 'absolute', width: 220, height: 220, borderRadius: 999, backgroundColor: THEME.tealSoft, top: -70, right: -60, opacity: 0.75 },
  bgBlobB: { position: 'absolute', width: 170, height: 170, borderRadius: 999, backgroundColor: THEME.amberSoft, top: 220, left: -60, opacity: 0.66 },
  bgBlobC: { position: 'absolute', width: 190, height: 190, borderRadius: 999, backgroundColor: '#F5D8CF', bottom: 20, right: -80, opacity: 0.58 },
  screenContent: { paddingTop: 10, paddingBottom: 120 },
  authWrap: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 48, gap: 14 },
  headerCard: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 24, backgroundColor: 'rgba(255,249,241,0.96)', borderWidth: 1, borderColor: THEME.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headerBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: THEME.ink, flexShrink: 1 },
  liveStatus: { marginHorizontal: 18, marginTop: 8, color: THEME.teal, fontWeight: '800', textTransform: 'capitalize' },
  heroCard: { marginHorizontal: 16, borderRadius: 28, padding: 22, backgroundColor: '#FFF4E6', borderWidth: 1, borderColor: THEME.border, overflow: 'hidden' },
  heroBlobA: { position: 'absolute', width: 140, height: 140, borderRadius: 999, backgroundColor: THEME.amberSoft, top: -30, right: -20, opacity: 0.88 },
  heroBlobB: { position: 'absolute', width: 120, height: 120, borderRadius: 999, backgroundColor: THEME.tealSoft, left: -20, bottom: -38, opacity: 0.72 },
  heroEyebrow: { color: THEME.coral, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: THEME.ink, lineHeight: 34, marginBottom: 8 },
  heroSubtitle: { color: THEME.muted, lineHeight: 22, marginBottom: 14 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoMark: { width: 72, height: 72, borderRadius: 24, backgroundColor: THEME.teal, position: 'relative', overflow: 'hidden' },
  logoMarkCompact: { width: 46, height: 46, borderRadius: 16 },
  logoHandle: { position: 'absolute', width: 14, height: 22, backgroundColor: THEME.coral, top: 15, left: 24, borderTopLeftRadius: 10, borderTopRightRadius: 10, transform: [{ rotate: '18deg' }] },
  logoTray: { position: 'absolute', width: 36, height: 11, backgroundColor: THEME.amber, bottom: 21, left: 19, borderRadius: 10, transform: [{ rotate: '-8deg' }] },
  logoWheelLeft: { position: 'absolute', width: 12, height: 12, borderRadius: 999, backgroundColor: THEME.white, bottom: 11, left: 18 },
  logoWheelRight: { position: 'absolute', width: 12, height: 12, borderRadius: 999, backgroundColor: THEME.white, bottom: 10, right: 18 },
  logoSpark: { position: 'absolute', width: 10, height: 10, borderRadius: 999, backgroundColor: THEME.white, top: 14, right: 14 },
  logoText: { fontSize: 28, fontWeight: '900', color: THEME.ink },
  logoTextCompact: { fontSize: 18 },
  logoCaption: { color: THEME.muted, marginTop: 3 },
  languageWrap: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,249,241,0.94)', borderWidth: 1, borderColor: THEME.border },
  languageLabel: { color: THEME.ink, fontWeight: '800', marginBottom: 10 },
  preferenceLabel: { marginTop: 6 },
  languageRow: { gap: 8, paddingRight: 10 },
  languageChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border },
  languageChipActive: { backgroundColor: THEME.teal, borderColor: THEME.teal },
  languageChipText: { color: THEME.ink, fontWeight: '700' },
  languageChipTextActive: { color: THEME.white },
  authCard: { marginHorizontal: 16, borderRadius: 24, padding: 18, backgroundColor: 'rgba(255,249,241,0.96)', borderWidth: 1, borderColor: THEME.border },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  workerCategoryBlock: { marginBottom: 12 },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  segmentActive: { backgroundColor: THEME.amberSoft, borderColor: THEME.amber },
  segmentText: { fontWeight: '800', color: THEME.ink },
  input: { borderWidth: 1, borderColor: THEME.border, borderRadius: 16, backgroundColor: THEME.white, color: THEME.ink, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, minHeight: 52 },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  demoText: { marginTop: 14, color: THEME.muted, lineHeight: 19 },
  loader: { marginTop: 10 },
  section: { marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: 'rgba(255,249,241,0.96)', borderWidth: 1, borderColor: THEME.border },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: THEME.ink, marginBottom: 10 },
  sectionHint: { color: THEME.muted, lineHeight: 20, marginBottom: 10 },
  queryLoader: { marginVertical: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile: { minWidth: 96, flexGrow: 1, backgroundColor: THEME.white, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 14, borderWidth: 1, borderColor: THEME.border },
  metricTileAccent: { backgroundColor: THEME.amberSoft },
  metricValue: { fontSize: 18, fontWeight: '800', color: THEME.ink },
  metricLabel: { marginTop: 4, fontSize: 12, fontWeight: '700', color: THEME.muted },
  button: { backgroundColor: THEME.teal, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: THEME.white, fontWeight: '800' },
  buttonTextSecondary: { color: THEME.ink },
  card: { backgroundColor: THEME.white, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.border, gap: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: THEME.ink },
  cardMeta: { color: THEME.muted, lineHeight: 19 },
  cardBody: { color: THEME.ink, lineHeight: 20 },
  badge: { backgroundColor: THEME.amber, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: THEME.ink, fontWeight: '800', fontSize: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: THEME.amberSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { color: '#87520A', fontSize: 12, fontWeight: '800' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '48%', minHeight: 92, borderRadius: 18, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 12, paddingVertical: 14, justifyContent: 'space-between' },
  categoryCardActive: { backgroundColor: THEME.tealSoft, borderColor: THEME.teal },
  categoryIcon: { fontSize: 24, marginBottom: 10 },
  categoryTitle: { color: THEME.ink, fontWeight: '800', lineHeight: 20 },
  categoryTitleActive: { color: THEME.teal },
  compactFieldRow: { flexDirection: 'row', gap: 10 },
  compactField: { flex: 1 },
  infoStrip: { backgroundColor: THEME.tealSoft, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  infoStripLabel: { color: THEME.ink, fontWeight: '800', flex: 1 },
  infoStripValue: { color: THEME.teal, fontWeight: '800' },
  mapBlock: { gap: 12 },
  mapWrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.white },
  map: { width: '100%', height: 260 },
  mapFallbackCard: { gap: 10 },
  mapFallbackTitle: { color: THEME.ink, fontWeight: '700', lineHeight: 20 },
  mapFallbackRow: { paddingRight: 6 },
  horizontalRail: { paddingRight: 8 },
  horizontalCard: { width: 286, marginRight: 12, borderRadius: 20 },
  horizontalCardSelected: { borderWidth: 2, borderColor: THEME.teal },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, marginRight: 8, marginBottom: 10 },
  choiceChipActive: { backgroundColor: THEME.tealSoft, borderColor: THEME.teal },
  choiceChipText: { color: THEME.ink, fontWeight: '700' },
  label: { marginBottom: 6, color: THEME.ink, fontWeight: '700' },
  subTitle: { fontSize: 16, fontWeight: '800', color: THEME.ink, marginTop: 14, marginBottom: 8 },
  timelineWrap: { gap: 10 },
  timelineItem: { flexDirection: 'row', gap: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: THEME.amber, marginTop: 6 },
  timelineLine: { flex: 1, borderLeftWidth: 1, borderLeftColor: THEME.border, paddingLeft: 10 },
  timelineTitle: { color: THEME.ink, fontWeight: '800' },
  timelineMeta: { color: THEME.muted, fontSize: 12 },
  ratingChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: THEME.bgSoft },
  ratingChipActive: { backgroundColor: THEME.amber },
  ratingChipText: { color: THEME.ink, fontWeight: '800' },
  reviewCard: { backgroundColor: '#FFF4E6', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.amberSoft },
  chatPanel: { gap: 10 },
  chatMessages: { maxHeight: 280 },
  chatBubble: { backgroundColor: '#FFF4E6', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: THEME.border },
  chatSender: { color: THEME.ink, fontWeight: '800', marginBottom: 2 },
  chatInput: { minHeight: 58, maxHeight: 120 },
  supportCard: { gap: 10 },
  assistantAnswerCard: { backgroundColor: THEME.tealSoft, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: THEME.tealSoft },
  routeCard: { gap: 10 },
  routeFallbackCard: { borderRadius: 18, padding: 14, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, gap: 4 },
  routeMapWrap: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.white },
  routeMap: { width: '100%', height: 210 },
  errorText: { color: THEME.danger },
});








