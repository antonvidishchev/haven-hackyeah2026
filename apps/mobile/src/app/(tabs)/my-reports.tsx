import { enumLabels, type ReportSummary } from '@haven/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Alert } from '@/components/form';
import { Action, Card, Label, Note } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import { api } from '@/lib/api';
import { useStartReport } from '@/lib/use-start-report';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

const PAGE_SIZE = 20;

function ReportRow({ report }: { report: ReportSummary }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const router = useRouter();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const filed = report.state === 'submitted';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/report/[id]', params: { id: report.id } })}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.backgroundElement },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Label style={styles.bold}>
        {`${filed ? t('report.filed') : t('report.draft')}${report.reference ? ` · ${report.reference}` : ''}`}
      </Label>
      <Label>{enumLabels[locale].category[report.category]}</Label>
      {report.descriptionExcerpt ? (
        <Note numberOfLines={2}>{report.descriptionExcerpt}</Note>
      ) : null}
      <Note>
        {filed && report.submittedAt
          ? t('myReports.filedOn', { date: date.format(new Date(report.submittedAt)) })
          : t('myReports.updated', { date: date.format(new Date(report.updatedAt)) })}
        {' · '}
        {t('myReports.files', { count: report.evidenceCount })}
      </Note>
    </Pressable>
  );
}

export default function MyReportsScreen() {
  const { t } = useTranslation();
  const { token, principal } = useSession();
  const start = useStartReport();
  const [items, setItems] = useState<ReportSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);

  const loadFirst = useCallback(async () => {
    if (!token) return;
    const id = ++request.current;
    try {
      const page = await api.reports.list({ limit: PAGE_SIZE }, { token });
      if (id !== request.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setStatus('ready');
    } catch {
      if (id === request.current)
        setStatus((current) => (current === 'ready' ? current : 'failed'));
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst]),
  );

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api.reports.list({ cursor, limit: PAGE_SIZE }, { token });
      setItems((list) => [
        ...list,
        ...page.items.filter((item) => !list.some((i) => i.id === item.id)),
      ]);
      setCursor(page.nextCursor);
    } catch {
      // The button stays, so the resident can try again.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadFirst();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Note>{t('myReports.lead')}</Note>
          {principal?.role === 'guest' ? <Note>{t('myReports.guestNotice')}</Note> : null}
          {status === 'loading' ? <Label>{t('myReports.loading')}</Label> : null}
          {status === 'failed' ? (
            <>
              <Alert>{t('myReports.loadFailed')}</Alert>
              <Action label={t('myReports.retry')} onPress={() => void loadFirst()} />
            </>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        status === 'ready' ? (
          <Card>
            <Label accessibilityRole="header" style={styles.bold}>
              {t('myReports.empty')}
            </Label>
            <Note>{t('myReports.emptyBody')}</Note>
            <Action
              label={start.busy ? t('home.starting') : t('myReports.start')}
              disabled={start.busy}
              onPress={() => void start.start()}
            />
          </Card>
        ) : null
      }
      renderItem={({ item }) => <ReportRow report={item} />}
      ListFooterComponent={
        cursor ? (
          <Action
            label={t('myReports.older')}
            variant="outlined"
            disabled={loadingMore}
            onPress={() => void loadMore()}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: Spacing.sm },
  header: { gap: Spacing.sm, marginBottom: Spacing.sm },
  row: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
  bold: { fontWeight: '600' },
});
