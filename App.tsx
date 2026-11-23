import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { LessonDetailScreen } from './src/presentation/screens/LessonDetailScreen';
import { LessonsScreen } from './src/presentation/screens/LessonsScreen';
import { useAppStore } from './src/presentation/store/useAppStore';

export default function App() {
  const { isReady, selectedLesson, bootstrap } = useAppStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loaderText}>Iniciando almacenamiento cifrado...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {selectedLesson ? <LessonDetailScreen /> : <LessonsScreen />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderText: { marginTop: 12, fontSize: 14, color: '#334155' },
});