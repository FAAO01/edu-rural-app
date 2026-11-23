import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { INetworkPort, NetworkStatus } from '../../domain/ports/HardwarePorts';

export class NetInfoAdapter implements INetworkPort {
  async getCurrentStatus(): Promise<NetworkStatus> {
    const state = await NetInfo.fetch();
    return this.mapState(state);
  }

  subscribe(listener: (status: NetworkStatus) => void): () => void {
    return NetInfo.addEventListener((state) => {
      listener(this.mapState(state));
    });
  }

  private mapState(state: NetInfoState): NetworkStatus {
    const isConnected = Boolean(
      state.isConnected && state.isInternetReachable !== false
    );

    let isSlowOrMetered = Boolean(state.details?.isConnectionExpensive);

    if (state.type === 'cellular') {
      const generation = state.details?.cellularGeneration;
      if (generation === '2g' || generation === '3g') {
        isSlowOrMetered = true;
      }
    }

    return {
      isConnected,
      isSlowOrMetered,
    };
  }
}