import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
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
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './src/api/client';
import { LANGUAGE_OPTIONS, LOCALE_MAP, LanguageCode, TranslationKey, translations, statusLabels } from './src/i18n/translations';
import { useStompSubscriptions } from './src/realtime/useStompSubscriptions';
import { usePreferencesStore } from './src/store/preferences';
import { useSessionStore } from './src/store/session';
import { Booking, BookingStatus, Category, Review, WorkerCard } from './src/types';

const queryClient = new QueryClient();
const REFRESH_INTERVAL_MS = 5000;
const DEFAULT_MAP_REGION = { latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.08, longitudeDelta: 0.08 };
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
  PLUMBING: { en: 'Plumbing', hi: 'प्लंबिंग', mr: 'प्लंबिंग', te: 'ప్లంబింగ్', ta: 'பிளம்பிங்', gu: 'પ્લંબિંગ' },
  ELECTRICAL: { en: 'Electrical', hi: 'इलेक्ट्रिकल', mr: 'इलेक्ट्रिकल', te: 'ఎలక్ట్రికల్', ta: 'எலக்ட்ரிக்கல்', gu: 'ઇલેક્ટ્રિકલ' },
  PAINTING: { en: 'Painting', hi: 'पेंटिंग', mr: 'पेंटिंग', te: 'పెయింటింగ్', ta: 'பெயிண்டிங்', gu: 'પેઇન્ટિંગ' },
  CLEANING: { en: 'Cleaning', hi: 'सफाई', mr: 'स्वच्छता', te: 'శుభ్రపరచడం', ta: 'சுத்தம்', gu: 'સફાઈ' },
  HANDYMAN: { en: 'Handyman', hi: 'हैंडीमैन', mr: 'हँडीमॅन', te: 'హ్యాండీమ్యాన్', ta: 'ஹேண்டிமேன்', gu: 'હેન્ડીમેન' },
  GARDENING: { en: 'Gardening', hi: 'बागवानी', mr: 'बागकाम', te: 'తోటపని', ta: 'தோட்டப்பணி', gu: 'બાગબગીચો' },
};

function useI18n() {
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const t = (key: TranslationKey) => translations[language][key] ?? translations.en[key];
  return { language, setLanguage, t };
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `₹${Math.round(value)}`;
}

function formatDate(date: string, language: LanguageCode) {
  return new Date(date).toLocaleString(LOCALE_MAP[language]);
}

function formatStatus(status: BookingStatus, language: LanguageCode) {
  return statusLabels[language][status] ?? status.replaceAll('_', ' ');
}

function formatCategoryLabel(category: string, language: LanguageCode) {
  const key = category.toUpperCase().replace(/\s+/g, '_');
  return CATEGORY_LABELS[key]?.[language] ?? category.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
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

function FixCartLogo({ compact = false }: { compact?: boolean }) {
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
        {!compact ? <Text style={styles.logoCaption}>Comfortable local service booking</Text> : null}
      </View>
    </View>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
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

function AuthScreen() {
  const { t } = useI18n();
  const signIn = useSessionStore((state) => state.signIn);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('customer@fixcart.app');
  const [password, setPassword] = useState('Password@123');
  const [firstName, setFirstName] = useState('Rahul');
  const [lastName, setLastName] = useState('Sharma');
  const [phone, setPhone] = useState('9999999999');
  const [role, setRole] = useState<'CUSTOMER' | 'WORKER'>('CUSTOMER');
  const loginMutation = useMutation({ mutationFn: () => api.login({ email, password }), onSuccess: signIn, onError: (error: Error) => Alert.alert(t('loginFailed'), error.message) });
  const registerMutation = useMutation({ mutationFn: () => api.register({ email, password, firstName, lastName, phone, role }), onSuccess: signIn, onError: (error: Error) => Alert.alert(t('registrationFailed'), error.message) });

  return (
    <SafeAreaView style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.authWrap}>
        <AnimatedSection>
          <HeroBanner eyebrow={t('themeComfort')} title={t('loginHeroTitle')} subtitle={t('loginHeroSubtitle')}>
            <FixCartLogo />
          </HeroBanner>
        </AnimatedSection>
        <AnimatedSection delay={80}><LanguageSwitcher /></AnimatedSection>
        <AnimatedSection delay={140}>
          <View style={styles.authCard}>
            <View style={styles.segmentRow}>
              <TouchableOpacity style={[styles.segment, mode === 'login' && styles.segmentActive]} onPress={() => setMode('login')}><Text style={styles.segmentText}>{t('login')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segment, mode === 'register' && styles.segmentActive]} onPress={() => setMode('register')}><Text style={styles.segmentText}>{t('register')}</Text></TouchableOpacity>
            </View>
            {mode === 'register' ? (
              <>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder={t('firstName')} placeholderTextColor={THEME.muted} />
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder={t('lastName')} placeholderTextColor={THEME.muted} />
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t('phone')} placeholderTextColor={THEME.muted} keyboardType="phone-pad" />
                <View style={styles.segmentRow}>
                  <TouchableOpacity style={[styles.segment, role === 'CUSTOMER' && styles.segmentActive]} onPress={() => setRole('CUSTOMER')}><Text style={styles.segmentText}>{t('customer')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.segment, role === 'WORKER' && styles.segmentActive]} onPress={() => setRole('WORKER')}><Text style={styles.segmentText}>{t('worker')}</Text></TouchableOpacity>
                </View>
              </>
            ) : null}
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={t('email')} placeholderTextColor={THEME.muted} autoCapitalize="none" />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={t('password')} placeholderTextColor={THEME.muted} secureTextEntry />
            <ActionButton title={mode === 'login' ? t('continue') : t('createAccount')} onPress={() => (mode === 'login' ? loginMutation.mutate() : registerMutation.mutate())} disabled={loginMutation.isPending || registerMutation.isPending} />
            {(loginMutation.isPending || registerMutation.isPending) ? <ActivityIndicator style={styles.loader} color={THEME.teal} /> : null}
            <Text style={styles.demoText}>{t('demoAccounts')}: customer@fixcart.app / Password@123 and worker@fixcart.app / Password@123</Text>
          </View>
        </AnimatedSection>
      </ScrollView>
    </SafeAreaView>
  );
}
function WorkerCardView({ worker, language, t, isSaved = false, onToggleSaved }: { worker: WorkerCard; language: LanguageCode; t: (key: TranslationKey) => string; isSaved?: boolean; onToggleSaved?: () => void }) {
  const signals = [
    worker.rating >= 4.5 ? t('topRated') : null,
    worker.distanceKm !== null && worker.distanceKm !== undefined && worker.distanceKm <= 3 ? t('nearby') : null,
    worker.basePrice <= 500 ? t('affordableStart') : null,
    worker.available ? t('availableNow') : null,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {worker.recommendationScore ? <View style={styles.badge}><Text style={styles.badgeText}>{t('bestMatch')} • {(worker.recommendationScore * 100).toFixed(0)}%</Text></View> : <View />}
        {onToggleSaved ? <ActionButton title={isSaved ? t('saved') : t('save')} onPress={onToggleSaved} kind="secondary" /> : null}
      </View>
      <Text style={styles.cardTitle}>{worker.name}</Text>
      <Text style={styles.cardMeta}>{formatCategoryLabel(worker.category, language)} • {worker.experienceYears} {t('yearsExperience')}</Text>
      <Text style={styles.cardMeta}>Rating {worker.rating?.toFixed?.(1) ?? worker.rating}/5 • {worker.totalReviews ?? 0} {t('verifiedReviews')} • {t('startsAt')} {formatCurrency(worker.basePrice)}</Text>
      <View style={styles.pillRow}>
        {signals.map((signal) => <View key={signal} style={styles.pill}><Text style={styles.pillText}>{signal}</Text></View>)}
      </View>
      <Text style={styles.cardMeta}>{t('hourly')}: {formatCurrency(worker.hourlyRate)} • {t('distance')}: {worker.distanceKm ? `${worker.distanceKm.toFixed(1)} km` : 'N/A'}</Text>
      {worker.recommendationExplanation ? <Text style={styles.cardBody}>{worker.recommendationExplanation}</Text> : null}
      <Text style={styles.cardBody}>{worker.bio}</Text>
    </View>
  );
}

function NearbyWorkersMap({ workers, selectedWorkerId, onSelectWorker, savedWorkerIds, onToggleSaved, language, t }: { workers: WorkerCard[]; selectedWorkerId: string | null; onSelectWorker: (workerId: string) => void; savedWorkerIds: Set<string>; onToggleSaved: (workerId: string) => void; language: LanguageCode; t: (key: TranslationKey) => string }) {
  const selectedWorker = workers.find((worker) => worker.workerId === selectedWorkerId) ?? workers[0] ?? null;
  const region = selectedWorker ? { latitude: selectedWorker.latitude, longitude: selectedWorker.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 } : DEFAULT_MAP_REGION;
  if (!workers.length) return <SectionHint>{t('nearbyWorkersListHint')}</SectionHint>;
  return (
    <View style={styles.mapBlock}>
      <View style={styles.mapWrap}>
        <MapView style={styles.map} region={region}>
          {workers.map((worker) => (
            <Marker key={worker.workerId} coordinate={{ latitude: worker.latitude, longitude: worker.longitude }} title={worker.name} description={`${formatCategoryLabel(worker.category, language)} • ${formatCurrency(worker.basePrice)}`} pinColor={worker.workerId === selectedWorker?.workerId ? THEME.amber : THEME.teal} onPress={() => onSelectWorker(worker.workerId)} />
          ))}
        </MapView>
      </View>
      {selectedWorker ? <WorkerCardView worker={selectedWorker} language={language} t={t} isSaved={savedWorkerIds.has(selectedWorker.workerId)} onToggleSaved={() => onToggleSaved(selectedWorker.workerId)} /> : null}
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

function BookingCard({ booking, language, t, onChat, onSelect, onReview, onRebook }: { booking: Booking; language: LanguageCode; t: (key: TranslationKey) => string; onChat?: () => void; onSelect?: () => void; onReview?: () => void; onRebook?: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{booking.title}</Text>
      <Text style={styles.cardMeta}>{formatCategoryLabel(booking.category, language)} • {formatStatus(booking.status, language)}</Text>
      <Text style={styles.cardMeta}>{t('budget')}: {formatCurrency(booking.budget)} • {t('expectedHours')}: {booking.expectedDurationHours}h</Text>
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
  return <View style={styles.actionRow}>{[1, 2, 3, 4, 5].map((item) => <TouchableOpacity key={item} style={[styles.ratingChip, String(item) === value && styles.ratingChipActive]} onPress={() => onChange(String(item))}><Text style={styles.ratingChipText}>{item}★</Text></TouchableOpacity>)}</View>;
}

function ExistingReviewCard({ review, language, t }: { review: Review; language: LanguageCode; t: (key: TranslationKey) => string }) {
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.cardTitle}>{t('reviewSubmitted')}</Text>
      <Text style={styles.cardMeta}>Rating: {review.rating}/5</Text>
      <Text style={styles.cardBody}>{review.comment}</Text>
      <Text style={styles.timelineMeta}>{formatDate(review.createdAt, language)}</Text>
    </View>
  );
}

function ChatPanel({ token, bookingId, t, language }: { token: string; bookingId: string; t: (key: TranslationKey) => string; language: LanguageCode }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const roomQuery = useQuery({ queryKey: ['chat', bookingId], queryFn: () => api.chatRoom(token, bookingId), refetchInterval: REFRESH_INTERVAL_MS });
  const sendMutation = useMutation({
    mutationFn: async () => api.sendMessage(token, bookingId, message),
    onSuccess: async () => { setMessage(''); await queryClient.invalidateQueries({ queryKey: ['chat', bookingId] }); },
    onError: (error: Error) => Alert.alert(t('messageFailed'), error.message),
  });
  if (roomQuery.isLoading) return <ActivityIndicator color={THEME.teal} />;
  if (roomQuery.isError) return <Text style={styles.errorText}>{t('chatUnavailable')}</Text>;
  return (
    <View>
      {roomQuery.data?.messages.length ? roomQuery.data.messages.map((item) => (
        <View key={item.id} style={styles.chatBubble}>
          <Text style={styles.chatSender}>{item.senderName}</Text>
          <Text style={styles.cardBody}>{item.message}</Text>
          <Text style={styles.timelineMeta}>{formatDate(item.sentAt, language)}</Text>
        </View>
      )) : <SectionHint>{t('noMessagesYet')}</SectionHint>}
      <TextInput style={styles.input} value={message} onChangeText={setMessage} placeholder={t('message')} placeholderTextColor={THEME.muted} />
      <ActionButton title={sendMutation.isPending ? t('sending') : t('send')} onPress={() => sendMutation.mutate()} disabled={!message.trim() || sendMutation.isPending} />
    </View>
  );
}

function RoutePreview({ booking, t }: { booking: Booking; t: (key: TranslationKey) => string }) {
  return (
    <View style={styles.routeCard}>
      <SectionHint>{t('workerRouteMapHint')}</SectionHint>
      <View style={styles.routeMapWrap}>
        <MapView style={styles.routeMap} region={{ latitude: booking.latitude, longitude: booking.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
          <Marker coordinate={{ latitude: booking.latitude, longitude: booking.longitude }} title={booking.customerName} description={booking.address} />
        </MapView>
      </View>
      <ActionButton title={t('openDirections')} onPress={() => void openDirections(booking.latitude, booking.longitude, t('mapUnavailable'))} />
    </View>
  );
}
function CustomerDashboard() {
  const { language, t } = useI18n();
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
    <SafeAreaView style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.screenContent}>
        <AnimatedSection>
          <View style={styles.headerCard}><View style={styles.headerBlock}><FixCartLogo compact /><Text style={styles.headerTitle}>{t('customerDashboard')}</Text></View><ActionButton title={t('logout')} onPress={() => void signOut()} kind="secondary" /></View>
          <Text style={styles.liveStatus}>{t('liveUpdates')}: {realtimeLabel(customerRealtimeStatus, t)}</Text>
        </AnimatedSection>
        <AnimatedSection delay={60}><LanguageSwitcher /></AnimatedSection>
        <AnimatedSection delay={100}><HeroBanner eyebrow={t('quickBooking')} title={t('quickBookingTitle')} subtitle={t('quickBookingSubtitle')}><View style={styles.metricGrid}><MetricTile label={t('nearbyWorkers')} value={String(workers.length)} accent /><MetricTile label={t('savedWorkers')} value={String(savedWorkerIds.size)} /><MetricTile label={t('activeBookings')} value={String(bookings.length)} /></View></HeroBanner></AnimatedSection>
        {workers[0] ? <AnimatedSection delay={130}><Section title={t('topRecommendedWorker')}><SectionHint>{t('topRecommendedHint')}</SectionHint><WorkerCardView worker={workers[0]} language={language} t={t} isSaved={savedWorkerIds.has(workers[0].workerId)} onToggleSaved={() => handleToggleSavedWorker(workers[0].workerId)} /></Section></AnimatedSection> : null}
        <AnimatedSection delay={160}><Section title={t('savedWorkersTitle')}>{savedWorkersVisible.length ? savedWorkersVisible.map((worker) => <WorkerCardView key={worker.workerId} worker={worker} language={language} t={t} isSaved onToggleSaved={() => handleToggleSavedWorker(worker.workerId)} />) : <SectionHint>{t('savedWorkersHint')}</SectionHint>}</Section></AnimatedSection>
        <AnimatedSection delay={190}><Section title={t('nearbyWorkersMap')}><SectionHint>{t('nearbyWorkersMapHint')}</SectionHint><NearbyWorkersMap workers={workers} selectedWorkerId={selectedWorkerId} onSelectWorker={setSelectedWorkerId} savedWorkerIds={savedWorkerIds} onToggleSaved={handleToggleSavedWorker} language={language} t={t} /></Section></AnimatedSection>
        <AnimatedSection delay={220}><Section title={t('nearbyWorkers')}><SectionHint>{t('nearbyWorkersListHint')}</SectionHint><ScrollView horizontal showsHorizontalScrollIndicator={false}>{workers.map((worker) => <TouchableOpacity key={worker.workerId} style={[styles.horizontalCard, selectedWorkerId === worker.workerId && styles.horizontalCardSelected]} onPress={() => setSelectedWorkerId(worker.workerId)}><WorkerCardView worker={worker} language={language} t={t} isSaved={savedWorkerIds.has(worker.workerId)} onToggleSaved={() => handleToggleSavedWorker(worker.workerId)} /></TouchableOpacity>)}</ScrollView></Section></AnimatedSection>
        <AnimatedSection delay={250}><Section title={t('createServiceRequest')}><Text style={styles.label}>{t('category')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{(categoriesQuery.data ?? []).map((category: Category) => <TouchableOpacity key={category.id} style={[styles.choiceChip, selectedCategory === category.code && styles.choiceChipActive]} onPress={() => setSelectedCategory(category.code)}><Text style={styles.choiceChipText}>{formatCategoryLabel(category.code || category.name, language)}</Text></TouchableOpacity>)}</ScrollView><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={t('jobTitle')} placeholderTextColor={THEME.muted} /><TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={t('describeIssue')} placeholderTextColor={THEME.muted} multiline /><TextInput style={styles.input} value={budget} onChangeText={setBudget} placeholder={t('budget')} placeholderTextColor={THEME.muted} keyboardType="numeric" /><TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder={t('expectedHours')} placeholderTextColor={THEME.muted} keyboardType="numeric" /><TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={t('address')} placeholderTextColor={THEME.muted} /><ActionButton title={createBookingMutation.isPending ? t('broadcasting') : t('broadcastRequest')} onPress={() => createBookingMutation.mutate()} disabled={createBookingMutation.isPending} /></Section></AnimatedSection>
        <AnimatedSection delay={280}><Section title={t('myBookings')}>{bookings.length ? bookings.map((booking) => <BookingCard key={booking.bookingId} booking={booking} language={language} t={t} onSelect={() => setSelectedBookingId(booking.bookingId)} onChat={booking.workerId ? () => setSelectedBookingId(booking.bookingId) : undefined} onReview={booking.status === 'COMPLETED' ? () => setSelectedBookingId(booking.bookingId) : undefined} onRebook={booking.status === 'COMPLETED' ? () => handleRebook(booking) : undefined} />) : <SectionHint>{t('noBookingsYet')}</SectionHint>}</Section></AnimatedSection>
        {selectedBooking ? <AnimatedSection delay={310}><Section title={t('selectedBookingDetails')}><Text style={styles.cardTitle}>{selectedBooking.title}</Text><Text style={styles.cardMeta}>{formatStatus(selectedBooking.status, language)}</Text><Text style={styles.cardBody}>{selectedBooking.description}</Text><Text style={styles.cardMeta}>{t('preferredTime')}: {formatDate(selectedBooking.preferredTime, language)}</Text>{selectedBooking.workerName ? <Text style={styles.cardMeta}>{t('workerLabel')}: {selectedBooking.workerName}</Text> : null}<SectionHint>{t('customerActionsHint')}</SectionHint><BookingActions actions={selectedActions} language={language} t={t} onStatus={(status) => updateStatusMutation.mutate({ bookingId: selectedBooking.bookingId, status })} /><Text style={styles.subTitle}>{t('statusHistory')}</Text><StatusTimeline booking={selectedBooking} language={language} /></Section></AnimatedSection> : null}
        {selectedBooking?.workerId ? <AnimatedSection delay={340}><Section title={`${t('chat')}: ${selectedBooking.title}`}><ChatPanel token={token} bookingId={selectedBooking.bookingId} t={t} language={language} /></Section></AnimatedSection> : null}
        {selectedBooking?.status === 'COMPLETED' && existingReview ? <AnimatedSection delay={370}><Section title={t('yourSubmittedReview')}><ExistingReviewCard review={existingReview} language={language} t={t} /></Section></AnimatedSection> : null}
        {selectedBooking?.status === 'COMPLETED' && !existingReview ? <AnimatedSection delay={400}><Section title={t('completeWithReview')}><Text style={styles.label}>{t('selectRating')}</Text><RatingPicker value={reviewRating} onChange={setReviewRating} /><TextInput style={[styles.input, styles.textArea]} value={reviewComment} onChangeText={setReviewComment} placeholder={t('review')} placeholderTextColor={THEME.muted} multiline /><ActionButton title={reviewMutation.isPending ? t('sending') : t('submitReview')} onPress={() => reviewMutation.mutate(selectedBooking.bookingId)} disabled={reviewMutation.isPending} /></Section></AnimatedSection> : null}
      </ScrollView>
    </SafeAreaView>
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
  const { language, t } = useI18n();
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
  const updateProfileMutation = useMutation({ mutationFn: () => api.updateWorkerProfile(token, { bio, primaryCategoryCode: 'PLUMBING', experienceYears: 6, basePrice: Number(basePrice), hourlyRate: Number(hourlyRate), latitude: 19.076, longitude: 72.8777, serviceRadiusKm: 20, available: true, availability: [{ dayOfWeek: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00' }, { dayOfWeek: 'WEDNESDAY', startTime: '09:00:00', endTime: '18:00:00' }, { dayOfWeek: 'SATURDAY', startTime: '09:00:00', endTime: '18:00:00' }] }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['worker-profile'] }); Alert.alert(t('profileUpdated')); } });
  const acceptMutation = useMutation({ mutationFn: (bookingId: string) => api.acceptBooking(token, bookingId), onSuccess: async (booking) => { setSelectedBookingId(booking.bookingId); await queryClient.invalidateQueries({ queryKey: ['open-bookings'] }); await queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); } });
  const statusMutation = useMutation({ mutationFn: ({ bookingId, status }: { bookingId: string; status: BookingStatus }) => api.updateBookingStatus(token, bookingId, status), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); } });
  const activeBookings = bookingsQuery.data ?? [];
  const completedBookings = activeBookings.filter((booking) => booking.status === 'COMPLETED');
  const netEarned = completedBookings.reduce((sum, booking) => sum + Number(booking.workerPayout ?? Math.max(0, booking.budget - (booking.platformFee ?? 0))), 0);
  const platformGenerated = completedBookings.reduce((sum, booking) => sum + Number(booking.platformFee ?? 0), 0);
  const selectedBooking = activeBookings.find((booking) => booking.bookingId === selectedBookingId) ?? activeBookings[0] ?? null;
  const selectedActions = selectedBooking ? (WORKER_STATUS_ACTIONS[selectedBooking.status] ?? []) : [];
  const workerRealtimeStatus = useStompSubscriptions(['/topic/bookings/open', ...(selectedBooking ? [`/topic/bookings/${selectedBooking.bookingId}`, `/topic/chat/${selectedBooking.bookingId}`] : [])], { '/topic/bookings/open': async () => { await queryClient.invalidateQueries({ queryKey: ['open-bookings'] }); }, ...(selectedBooking ? { [`/topic/bookings/${selectedBooking.bookingId}`]: async () => { await queryClient.invalidateQueries({ queryKey: ['worker-bookings'] }); await queryClient.invalidateQueries({ queryKey: ['open-bookings'] }); }, [`/topic/chat/${selectedBooking.bookingId}`]: async () => { await queryClient.invalidateQueries({ queryKey: ['chat', selectedBooking.bookingId] }); } } : {}) }, true);

  return (
    <SafeAreaView style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.screenContent}>
        <AnimatedSection><View style={styles.headerCard}><View style={styles.headerBlock}><FixCartLogo compact /><Text style={styles.headerTitle}>{t('workerDashboard')}</Text></View><ActionButton title={t('logout')} onPress={() => void signOut()} kind="secondary" /></View><Text style={styles.liveStatus}>{t('liveUpdates')}: {realtimeLabel(workerRealtimeStatus, t)}</Text></AnimatedSection>
        <AnimatedSection delay={60}><LanguageSwitcher /></AnimatedSection>
        <AnimatedSection delay={100}><HeroBanner eyebrow={t('revenueFocus')} title={t('revenueTitle')} subtitle={t('revenueSubtitle')}><View style={styles.metricGrid}><MetricTile label={t('openJobs')} value={String((openBookingsQuery.data ?? []).length)} accent /><MetricTile label={t('netEarned')} value={formatCurrency(netEarned)} /><MetricTile label={t('completedJobs')} value={String(completedBookings.length)} /></View></HeroBanner></AnimatedSection>
        <AnimatedSection delay={130}><Section title={t('profilePricing')}><SectionHint>{t('pricingHint')}</SectionHint><TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder={t('bio')} placeholderTextColor={THEME.muted} multiline /><TextInput style={styles.input} value={basePrice} onChangeText={setBasePrice} placeholder={t('basePrice')} placeholderTextColor={THEME.muted} keyboardType="numeric" /><TextInput style={styles.input} value={hourlyRate} onChangeText={setHourlyRate} placeholder={t('hourly')} placeholderTextColor={THEME.muted} keyboardType="numeric" /><ActionButton title={updateProfileMutation.isPending ? t('saving') : t('saveProfile')} onPress={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} /></Section></AnimatedSection>
        <AnimatedSection delay={160}><Section title={t('earningsSummary')}><SectionHint>{t('earningsHint')}</SectionHint><View style={styles.metricGrid}><MetricTile label={t('netPayout')} value={formatCurrency(netEarned)} accent /><MetricTile label={t('platformFee')} value={formatCurrency(platformGenerated)} /><MetricTile label={t('completedJobs')} value={String(completedBookings.length)} /></View></Section></AnimatedSection>
        <AnimatedSection delay={190}><Section title={t('recommendedOpenJobs')}>{(openBookingsQuery.data ?? []).length ? (openBookingsQuery.data ?? []).map((booking) => <View key={booking.bookingId}><BookingCard booking={booking} language={language} t={t} onSelect={() => setSelectedBookingId(booking.bookingId)} /><ActionButton title={`${t('acceptJob')} ${booking.title}`} onPress={() => acceptMutation.mutate(booking.bookingId)} /></View>) : <SectionHint>{t('noOpenJobs')}</SectionHint>}</Section></AnimatedSection>
        <AnimatedSection delay={220}><Section title={t('myActiveWork')}>{activeBookings.length ? activeBookings.map((booking) => <BookingCard key={booking.bookingId} booking={booking} language={language} t={t} onSelect={() => setSelectedBookingId(booking.bookingId)} onChat={() => setSelectedBookingId(booking.bookingId)} />) : <SectionHint>{t('noAcceptedJobs')}</SectionHint>}</Section></AnimatedSection>
        {selectedBooking ? <AnimatedSection delay={250}><Section title={t('selectedWorkDetails')}><Text style={styles.cardTitle}>{selectedBooking.title}</Text><Text style={styles.cardMeta}>{selectedBooking.customerName}</Text><Text style={styles.cardBody}>{selectedBooking.description}</Text><Text style={styles.cardMeta}>{t('address')}: {selectedBooking.address}</Text><Text style={styles.cardMeta}>{t('budget')}: {formatCurrency(selectedBooking.budget)}</Text><Text style={styles.subTitle}>{t('workerRouteMap')}</Text><RoutePreview booking={selectedBooking} t={t} /><BookingActions actions={selectedActions} language={language} t={t} onStatus={(status) => statusMutation.mutate({ bookingId: selectedBooking.bookingId, status })} /><Text style={styles.subTitle}>{t('statusHistory')}</Text><StatusTimeline booking={selectedBooking} language={language} /></Section></AnimatedSection> : null}
        {selectedBooking ? <AnimatedSection delay={280}><Section title={`${t('chat')}: ${selectedBooking.title}`}><ChatPanel token={token} bookingId={selectedBooking.bookingId} t={t} language={language} /></Section></AnimatedSection> : null}
      </ScrollView>
    </SafeAreaView>
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
  if (!sessionHydrated || !preferencesHydrated) return <SafeAreaView style={styles.centered}><ActivityIndicator color={THEME.teal} size="large" /></SafeAreaView>;
  if (!token || !effectiveRole) return <AuthScreen />;
  return effectiveRole === 'WORKER' ? <WorkerDashboard /> : <CustomerDashboard />;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><StatusBar style="dark" /><Root /></QueryClientProvider>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg },
  bgDecor: { ...StyleSheet.absoluteFillObject },
  bgBlobA: { position: 'absolute', width: 220, height: 220, borderRadius: 999, backgroundColor: THEME.tealSoft, top: -70, right: -60, opacity: 0.75 },
  bgBlobB: { position: 'absolute', width: 170, height: 170, borderRadius: 999, backgroundColor: THEME.amberSoft, top: 220, left: -60, opacity: 0.66 },
  bgBlobC: { position: 'absolute', width: 190, height: 190, borderRadius: 999, backgroundColor: '#F5D8CF', bottom: 20, right: -80, opacity: 0.58 },
  screenContent: { paddingBottom: 34 },
  authWrap: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 36, gap: 14 },
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
  languageRow: { gap: 8, paddingRight: 10 },
  languageChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border },
  languageChipActive: { backgroundColor: THEME.teal, borderColor: THEME.teal },
  languageChipText: { color: THEME.ink, fontWeight: '700' },
  languageChipTextActive: { color: THEME.white },
  authCard: { marginHorizontal: 16, borderRadius: 24, padding: 18, backgroundColor: 'rgba(255,249,241,0.96)', borderWidth: 1, borderColor: THEME.border },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: THEME.white, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  segmentActive: { backgroundColor: THEME.amberSoft, borderColor: THEME.amber },
  segmentText: { fontWeight: '800', color: THEME.ink },
  input: { borderWidth: 1, borderColor: THEME.border, borderRadius: 16, backgroundColor: THEME.white, color: THEME.ink, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  demoText: { marginTop: 14, color: THEME.muted, lineHeight: 19 },
  loader: { marginTop: 10 },
  section: { marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: 'rgba(255,249,241,0.96)', borderWidth: 1, borderColor: THEME.border },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: THEME.ink, marginBottom: 10 },
  sectionHint: { color: THEME.muted, lineHeight: 20, marginBottom: 10 },
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
  mapBlock: { gap: 12 },
  mapWrap: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.white },
  map: { width: '100%', height: 260 },
  horizontalCard: { width: 320, marginRight: 12, borderRadius: 20 },
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
  chatBubble: { backgroundColor: '#FFF4E6', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: THEME.border },
  chatSender: { color: THEME.ink, fontWeight: '800', marginBottom: 2 },
  routeCard: { gap: 10 },
  routeMapWrap: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.white },
  routeMap: { width: '100%', height: 210 },
  errorText: { color: THEME.danger },
});
