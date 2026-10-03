import { validateEvidence, type EvidenceItem } from '@haven/shared';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { Alert } from '@/components/form';
import { Action, Label, Note } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import {
  evidenceMaxBytes,
  formatBytes,
  mediaTypeFor,
  uploadEvidence,
  type LocalFile,
  type UploadError,
} from '@/lib/evidence';
import { useSession } from '@/session/SessionProvider';

type Upload = {
  key: string;
  file: LocalFile;
  status: 'waiting' | 'uploading' | 'failed';
  progress: number;
  error?: UploadError;
};

const rejectionKey = {
  type: 'errorType',
  empty: 'errorEmpty',
  too_large: 'errorTooLarge',
} as const;

function toLocalFile(asset: ImagePicker.ImagePickerAsset, index: number): LocalFile {
  const video = asset.type === 'video';
  const name =
    asset.fileName ??
    `${video ? 'video' : 'photo'}-${Date.now()}-${index}.${video ? 'mp4' : 'jpg'}`;
  return {
    uri: asset.uri,
    name,
    mediaType: asset.mimeType ?? mediaTypeFor(name, video ? 'video/mp4' : 'image/jpeg'),
    byteSize: asset.fileSize ?? null,
  };
}

/**
 * Photos and videos from the library or camera, plus audio from the Record screen. Files upload
 * one at a time with progress; a failed upload can be retried or dismissed.
 */
export function EvidenceUploader({
  reportId,
  onUploaded,
}: {
  reportId: string;
  onUploaded: (item: EvidenceItem) => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { token } = useSession();
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [denied, setDenied] = useState<'camera' | 'library' | null>(null);
  const running = useRef(false);
  const queue = useRef<Upload[]>([]);

  const update = (key: string, patch: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)));

  async function drain() {
    if (running.current) return;
    running.current = true;
    while (queue.current.length > 0) {
      const next = queue.current.shift()!;
      update(next.key, { status: 'uploading', progress: 0, error: undefined });
      try {
        const item = await uploadEvidence(reportId, next.file, token, (progress) =>
          update(next.key, { progress }),
        );
        setUploads((list) => list.filter((u) => u.key !== next.key));
        onUploaded(item);
      } catch (error) {
        update(next.key, { status: 'failed', error: error as UploadError });
      }
    }
    running.current = false;
  }

  function enqueue(files: LocalFile[]) {
    const added = files.map((file, index): Upload => {
      const key = `${Date.now()}-${index}-${file.name}`;
      const rejection =
        file.byteSize === null
          ? null
          : validateEvidence(
              { mediaType: file.mediaType, byteSize: file.byteSize },
              evidenceMaxBytes,
            );
      return rejection
        ? { key, file, status: 'failed', progress: 0, error: rejectionKey[rejection] }
        : { key, file, status: 'waiting', progress: 0 };
    });
    setUploads((list) => [...list, ...added]);
    queue.current.push(...added.filter((u) => u.status === 'waiting'));
    void drain();
  }

  function retry(upload: Upload) {
    update(upload.key, { status: 'waiting', error: undefined });
    queue.current.push(upload);
    void drain();
  }

  async function pick(source: 'library' | 'photo' | 'video') {
    setDenied(null);
    const permission =
      source === 'library'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setDenied(source === 'library' ? 'library' : 'camera');
    const result =
      source === 'library'
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsMultipleSelection: true,
            quality: 0.9,
          })
        : await ImagePicker.launchCameraAsync({
            mediaTypes: [source === 'photo' ? 'images' : 'videos'],
            quality: 0.9,
          });
    if (!result.canceled) enqueue(result.assets.map(toLocalFile));
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      <Label style={{ fontWeight: '600' }}>{t('evidence.addLabel')}</Label>
      <Note>{t('evidence.addHint', { size: formatBytes(evidenceMaxBytes, locale) })}</Note>
      <Action
        label={t('evidence.choose')}
        variant="outlined"
        onPress={() => void pick('library')}
      />
      <Action label={t('evidence.photo')} variant="outlined" onPress={() => void pick('photo')} />
      <Action label={t('evidence.video')} variant="outlined" onPress={() => void pick('video')} />
      <Action
        label={t('evidence.audio')}
        variant="outlined"
        onPress={() => router.push({ pathname: '/record', params: { mode: 'audio', reportId } })}
      />
      {denied ? (
        <View style={{ gap: Spacing.sm }}>
          <Alert tone="warning">
            {denied === 'camera' ? t('evidence.cameraDenied') : t('evidence.libraryDenied')}
          </Alert>
          <Action
            label={t('evidence.openSettings')}
            variant="outlined"
            onPress={() => void Linking.openSettings()}
          />
        </View>
      ) : null}
      {uploads.map((upload) => (
        <View key={upload.key} style={{ gap: Spacing.xs }}>
          {upload.status === 'failed' ? (
            <>
              <Alert>
                {`${t('evidence.failed', { name: upload.file.name })} ${t(
                  `evidence.${upload.error ?? 'errorFailed'}`,
                  { size: formatBytes(evidenceMaxBytes, locale) },
                )}`}
              </Alert>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {upload.error === 'errorFailed' ? (
                  <Action label={t('evidence.retry')} onPress={() => retry(upload)} />
                ) : null}
                <Action
                  label={t('evidence.dismiss')}
                  variant="outlined"
                  onPress={() => setUploads((list) => list.filter((u) => u.key !== upload.key))}
                />
              </View>
            </>
          ) : (
            <Note
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: upload.progress }}
              accessibilityLiveRegion="polite"
            >
              {t('evidence.uploading', { name: upload.file.name, progress: upload.progress })}
            </Note>
          )}
        </View>
      ))}
    </View>
  );
}
