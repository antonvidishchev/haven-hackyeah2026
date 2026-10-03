import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraView as CameraViewRef,
} from 'expo-camera';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '@/components/form';
import { Action, Label, Note, Title } from '@/components/ui';
import { FontSize, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { formatDuration, mediaTypeFor, uploadEvidence, type LocalFile } from '@/lib/evidence';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'audio' | 'video';
type Phase = 'ready' | 'recording' | 'saved' | 'attaching';
type Permission = 'unknown' | 'granted' | 'ask' | 'blocked';

/** Screen readers hear the elapsed time this often while recording. */
const ANNOUNCE_EVERY_MS = 30_000;

/** Milliseconds since `startedAt`, ticking while it is set. */
function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [startedAt]);
  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

const toPermission = (response: { granted: boolean; canAskAgain: boolean }): Permission =>
  response.granted ? 'granted' : response.canAskAgain ? 'ask' : 'blocked';

/**
 * Full-screen capture of audio or rear-camera video, in the foreground only. A recording is kept
 * on this screen until the resident continues to a report; capture never files anything.
 */
export default function RecordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { token } = useSession();
  const params = useLocalSearchParams<{ mode?: string; reportId?: string }>();
  const mode: Mode = params.mode === 'video' ? 'video' : 'audio';
  const reportId = params.reportId;

  const [phase, setPhase] = useState<Phase>('ready');
  const [file, setFile] = useState<LocalFile | null>(null);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);

  // Audio
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [micPermission, setMicPermission] = useState<Permission>('unknown');

  // Video
  const camera = useRef<CameraViewRef>(null);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [microphonePermission, requestMicrophone] = useMicrophonePermissions();
  const [videoStartedAt, setVideoStartedAt] = useState<number | null>(null);
  const videoElapsed = useElapsed(videoStartedAt);

  const elapsed = mode === 'audio' ? recorderState.durationMillis : videoElapsed;
  const lastAnnounced = useRef(0);

  const permission: Permission =
    mode === 'audio'
      ? micPermission
      : !cameraPermission || !microphonePermission
        ? 'unknown'
        : cameraPermission.granted && microphonePermission.granted
          ? 'granted'
          : (!cameraPermission.granted && !cameraPermission.canAskAgain) ||
              (!microphonePermission.granted && !microphonePermission.canAskAgain)
            ? 'blocked'
            : 'ask';

  async function askAudio() {
    setMicPermission(toPermission(await requestRecordingPermissionsAsync()));
  }

  async function askVideo() {
    if (!cameraPermission?.granted) await requestCamera();
    if (!microphonePermission?.granted) await requestMicrophone();
  }

  // Audio asks as the screen opens: the resident chose "Record audio" a moment ago.
  useEffect(() => {
    if (mode !== 'audio') return;
    void requestRecordingPermissionsAsync().then((response) =>
      setMicPermission(toPermission(response)),
    );
  }, [mode]);

  async function start() {
    setFailed(false);
    setFile(null);
    lastAnnounced.current = 0;
    if (mode === 'audio') {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
      return;
    }
    if (!camera.current) return;
    setPhase('recording');
    const startedAt = Date.now();
    setVideoStartedAt(startedAt);
    try {
      const result = await camera.current.recordAsync();
      setVideoStartedAt(null);
      if (!result?.uri) return setPhase('ready');
      setDuration(Date.now() - startedAt);
      setFile({
        uri: result.uri,
        name: `video-${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`,
        mediaType: mediaTypeFor(result.uri, 'video/mp4'),
        byteSize: null,
      });
      setPhase('saved');
    } catch {
      setVideoStartedAt(null);
      setPhase('ready');
    }
  }

  async function stop() {
    if (mode === 'video') {
      // recordAsync() resolves with the file once stopped.
      camera.current?.stopRecording();
      return;
    }
    const recorded = recorderState.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (!recorder.uri) return setPhase('ready');
    const extension = recorder.uri.split('.').pop() ?? 'm4a';
    setDuration(recorded);
    setFile({
      uri: recorder.uri,
      name: `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`,
      mediaType: mediaTypeFor(recorder.uri, 'audio/mp4'),
      byteSize: null,
    });
    setPhase('saved');
  }

  // Foreground only: leaving the app stops and keeps what was recorded so far.
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => {
    if (phase !== 'recording') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void stopRef.current();
    });
    return () => subscription.remove();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'recording') return;
    if (elapsed - lastAnnounced.current >= ANNOUNCE_EVERY_MS) {
      lastAnnounced.current = elapsed;
      AccessibilityInfo.announceForAccessibility(
        t('capture.elapsed', { time: formatDuration(elapsed) }),
      );
    }
  }, [elapsed, phase, t]);

  async function attach() {
    if (!file) return;
    setPhase('attaching');
    setFailed(false);
    setProgress(0);
    try {
      const target = reportId ?? (await api.reports.create({ token })).id;
      await uploadEvidence(target, file, token, setProgress);
      if (reportId) router.back();
      else router.replace({ pathname: '/report/[id]', params: { id: target } });
    } catch {
      setFailed(true);
      setPhase('saved');
    }
  }

  const permissionBody =
    mode === 'audio' ? t('capture.permissionAudio') : t('capture.permissionVideo');
  const title = mode === 'audio' ? t('capture.audio') : t('capture.video');

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Title>{title}</Title>
        <Note>{t('capture.foreground')}</Note>
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.body}>
          <Label>{t('capture.unavailable')}</Label>
        </View>
      ) : permission !== 'granted' ? (
        <View style={styles.body}>
          <Label accessibilityRole="header" style={styles.bold}>
            {t('capture.permissionTitle')}
          </Label>
          <Label>{permissionBody}</Label>
          {permission === 'blocked' ? (
            <Action label={t('capture.openSettings')} onPress={() => void Linking.openSettings()} />
          ) : (
            <Action
              label={t('capture.allow')}
              onPress={() => void (mode === 'audio' ? askAudio() : askVideo())}
            />
          )}
        </View>
      ) : (
        <View style={styles.flex}>
          {mode === 'video' && phase !== 'saved' && phase !== 'attaching' ? (
            <CameraView
              ref={camera}
              style={styles.flex}
              facing="back"
              mode="video"
              accessibilityLabel={t('capture.video')}
            />
          ) : (
            <View style={[styles.flex, styles.center]}>
              <Label
                accessibilityLabel={
                  phase === 'recording'
                    ? t('capture.elapsed', { time: formatDuration(elapsed) })
                    : undefined
                }
                style={[
                  styles.timer,
                  { color: phase === 'recording' ? colors.destructive : colors.text },
                ]}
              >
                {formatDuration(phase === 'recording' ? elapsed : duration)}
              </Label>
            </View>
          )}
          {mode === 'video' && phase === 'recording' ? (
            <Label
              style={[
                styles.overlay,
                { color: colors.destructive, backgroundColor: colors.background },
              ]}
            >
              {`${t('capture.recording')} · ${formatDuration(elapsed)}`}
            </Label>
          ) : null}
        </View>
      )}

      <View style={styles.footer}>
        {phase === 'saved' || phase === 'attaching' ? (
          <Label accessibilityLiveRegion="polite" style={styles.bold}>
            {phase === 'attaching'
              ? `${t('capture.attaching')} ${progress}%`
              : t('capture.saved', { time: formatDuration(duration) })}
          </Label>
        ) : null}
        {failed ? <Alert>{t('capture.failed')}</Alert> : null}
        {permission === 'granted' && phase === 'ready' ? (
          <Action label={t('capture.start')} variant="destructive" onPress={() => void start()} />
        ) : null}
        {phase === 'recording' ? (
          <Action label={t('capture.stop')} onPress={() => void stop()} />
        ) : null}
        {phase === 'saved' ? (
          <>
            <Action
              label={reportId ? t('capture.addToReport') : t('capture.continue')}
              onPress={() => void attach()}
            />
            <Action
              label={t('capture.again')}
              variant="outlined"
              onPress={() => {
                setFile(null);
                setFailed(false);
                setPhase('ready');
              }}
            />
          </>
        ) : null}
        {phase !== 'recording' && phase !== 'attaching' ? (
          <Action label={t('capture.close')} variant="outlined" onPress={() => router.back()} />
        ) : null}
        <Note>{t('capture.never')}</Note>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.md, gap: Spacing.xs },
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  bold: { fontWeight: '600' },
  timer: { fontSize: 56, fontWeight: '300', fontVariant: ['tabular-nums'], lineHeight: 64 },
  overlay: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  footer: { padding: Spacing.md, gap: Spacing.sm },
});
