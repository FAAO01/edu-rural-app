import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NetworkStatus } from '../../domain/ports/HardwarePorts';

interface Props {
  status: NetworkStatus;
}

export const ConnectionStatusBadge: React.FC<Props> = ({ status }) => {
  const label = !status.isConnected
    ? 'Modo Sin Conexión (Caché Local Activa)'
    : status.isSlowOrMetered
    ? 'Red 2G/3G Detectada (Descarga Diferida)'
    : 'Conectado (Sincronización Lista)';

  const badgeColor = !status.isConnected
    ? '#B45309'
    : status.isSlowOrMetered
    ? '#0369A1'
    : '#15803D';

  return (
    <View style={[styles.container, { backgroundColor: badgeColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});