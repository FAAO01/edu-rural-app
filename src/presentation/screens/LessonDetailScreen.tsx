import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';

const LocalMediaPlayer: React.FC<{ localUri: string }> = ({ localUri }) => {
  const player = useVideoPlayer(localUri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      fullscreenOptions={{ enable: true }}
      nativeControls
    />
  );
};

export const LessonDetailScreen: React.FC = () => {
  const {
    selectedLesson,
    closeLesson,
    submitLessonCompletion,
    lastSyncMessage,
  } = useAppStore();

  if (!selectedLesson) return null;

  const isVideoReady =
    selectedLesson.downloadStatus === 'READY' &&
    Boolean(selectedLesson.localMediaUri);

  return (
    <ScrollView style={styles.container}>
      <Pressable onPress={closeLesson} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver a lecciones</Text>
      </Pressable>

      <Text style={styles.subject}>{selectedLesson.subject}</Text>
      <Text style={styles.title}>{selectedLesson.title}</Text>

      {isVideoReady && selectedLesson.localMediaUri ? (
        <LocalMediaPlayer localUri={selectedLesson.localMediaUri} />
      ) : (
        <View style={styles.deferredBox}>
          <Text style={styles.deferredTitle}>Multimedia en descarga diferida</Text>
          <Text style={styles.deferredDesc}>
            El video se descargará automáticamente cuando haya señal estable y
            batería suficiente. Puedes estudiar la guía escrita sin conexión.
          </Text>
        </View>
      )}

      <Text style={styles.body}>{selectedLesson.summaryText}</Text>

      <Pressable
        style={styles.completeBtn}
        onPress={() =>
          void submitLessonCompletion('est-nic-001', selectedLesson.id, 95)
        }
      >
        <Text style={styles.completeBtnText}>Completar Lección (Guardar Offline)</Text>
      </Pressable>

      {lastSyncMessage && (
        <Text style={styles.syncFeedback}>{lastSyncMessage}</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#0284C7', fontSize: 15, fontWeight: '600' },
  subject: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginVertical: 6 },
  video: { width: '100%', height: 200, backgroundColor: '#000', borderRadius: 8, marginVertical: 12 },
  deferredBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  deferredTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  deferredDesc: { fontSize: 13, color: '#78350F' },
  body: { fontSize: 16, lineHeight: 24, color: '#1E293B', marginVertical: 12 },
  completeBtn: {
    backgroundColor: '#15803D',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  completeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  syncFeedback: {
    marginTop: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 6,
  },
});