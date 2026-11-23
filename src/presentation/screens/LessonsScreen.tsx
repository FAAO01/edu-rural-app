import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DownloadStatus, Lesson } from '../../domain/entities/Lesson';
import { ConnectionStatusBadge } from '../components/ConnectionStatusBadge';
import { useAppStore } from '../store/useAppStore';

const STATUS_LABELS: Record<DownloadStatus, string> = {
  NOT_DOWNLOADED: 'Solo texto (Video pendiente)',
  QUEUED: 'En cola de descarga diferida',
  DOWNLOADING: 'Descargando en segundo plano...',
  READY: 'Multimedia listo sin conexión',
  FAILED: 'Descarga pausada por red/batería',
};

export const LessonsScreen: React.FC = () => {
  const { lessons, networkStatus, openLesson, refreshLessons } = useAppStore();

  const renderItem = ({ item }: { item: Lesson }) => (
    <Pressable style={styles.card} onPress={() => void openLesson(item.id)}>
      <Text style={styles.subject}>{item.subject}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.status}>{STATUS_LABELS[item.downloadStatus]}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>EduRural Nicaragua</Text>
      <ConnectionStatusBadge status={networkStatus} />

      <Pressable style={styles.refreshBtn} onPress={() => void refreshLessons()}>
        <Text style={styles.refreshText}>Actualizar estado local</Text>
      </Pressable>

      <FlashList
        data={lessons}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  refreshBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  refreshText: { color: '#0284C7', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subject: { fontSize: 12, color: '#475569', fontWeight: '600' },
  title: { fontSize: 16, color: '#0F172A', fontWeight: '700', marginVertical: 4 },
  status: { fontSize: 12, color: '#0369A1' },
});