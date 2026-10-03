import Ionicons from '@expo/vector-icons/Ionicons';
import { evidenceKind, type EvidenceItem } from '@haven/shared';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Label, Note } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import { formatBytes, mediaSource } from '@/lib/evidence';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

function ImagePreview({ item }: { item: EvidenceItem }) {
  const { t } = useTranslation();
  const { token } = useSession();
  return (
    <Image
      accessible
      accessibilityLabel={t('evidence.imageLabel', { name: item.fileName })}
      source={mediaSource(item.id, token)}
      contentFit="cover"
      style={styles.media}
    />
  );
}

function VideoPreview({ item }: { item: EvidenceItem }) {
  const { token } = useSession();
  const player = useVideoPlayer(mediaSource(item.id, token));
  return (
    <VideoView
      accessibilityLabel={item.fileName}
      player={player}
      nativeControls
      contentFit="contain"
      style={styles.media}
    />
  );
}

function AudioPreview({ item }: { item: EvidenceItem }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { token } = useSession();
  const player = useAudioPlayer(mediaSource(item.id, token));
  const status = useAudioPlayerStatus(player);
  const label = status.playing
    ? t('evidence.pause', { name: item.fileName })
    : t('evidence.play', { name: item.fileName });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (status.playing) return player.pause();
        if (status.didJustFinish || status.currentTime >= status.duration) void player.seekTo(0);
        player.play();
      }}
      style={[styles.audio, { borderColor: colors.input }]}
    >
      <Ionicons
        name={status.playing ? 'pause' : 'play'}
        size={24}
        color={colors.primary}
        importantForAccessibility="no"
      />
      <Label numberOfLines={1} style={styles.flex}>
        {item.fileName}
      </Label>
    </Pressable>
  );
}

/** Uploaded evidence with previews. `onRemove` is only given for drafts. */
export function EvidenceList({
  items,
  onRemove,
}: {
  items: EvidenceItem[];
  onRemove?: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors } = useTheme();

  if (items.length === 0) return <Note>{t('evidence.none')}</Note>;

  function confirmRemove(item: EvidenceItem) {
    // react-native-web's Alert has no buttons.
    if (Platform.OS === 'web') {
      if (globalThis.confirm(t('evidence.removeBody', { name: item.fileName }))) {
        void onRemove?.(item.id);
      }
      return;
    }
    Alert.alert(t('evidence.removeTitle'), t('evidence.removeBody', { name: item.fileName }), [
      { text: t('evidence.cancel'), style: 'cancel' },
      {
        text: t('evidence.remove'),
        style: 'destructive',
        onPress: () => void onRemove?.(item.id),
      },
    ]);
  }

  return (
    <View style={{ gap: Spacing.md }}>
      {items.map((item) => {
        const kind = evidenceKind(item.mediaType);
        return (
          <View key={item.id} style={[styles.item, { borderColor: colors.border }]}>
            {kind === 'image' ? <ImagePreview item={item} /> : null}
            {kind === 'video' ? <VideoPreview item={item} /> : null}
            {kind === 'audio' ? <AudioPreview item={item} /> : null}
            <View style={styles.meta}>
              <View style={styles.flex}>
                <Label numberOfLines={1}>{item.fileName}</Label>
                <Note>{formatBytes(item.byteSize, locale)}</Note>
              </View>
              {onRemove ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('evidence.remove')}: ${item.fileName}`}
                  hitSlop={8}
                  onPress={() => confirmRemove(item)}
                  style={styles.remove}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.destructive} />
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: { borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  media: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  audio: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
  remove: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
