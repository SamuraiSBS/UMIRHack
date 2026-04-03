import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface Order {
  id: string;
  status: string;
  address: string;
  business: { name: string };
}

type Props = NativeStackScreenProps<RootStackParamList, 'ShiftControl'>;

export default function ShiftControlScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        api.get('/courier/shift'),
        api.get('/courier/orders'),
      ]).then(([shiftRes, ordersRes]) => {
        setIsActive(shiftRes.data.isActive);
        const active = ordersRes.data.find(
          (o: Order) => o.status === 'ACCEPTED' || o.status === 'DELIVERING'
        );
        setActiveOrder(active || null);
      }).finally(() => setLoading(false));
    }, [])
  );

  async function toggleShift() {
    setToggling(true);
    try {
      if (isActive) {
        await api.post('/courier/shift/stop');
        setIsActive(false);
      } else {
        await api.post('/courier/shift/start');
        setIsActive(true);
      }
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>
        Привет, <Text style={{ fontWeight: '700' }}>{user?.name || user?.email}</Text>!
      </Text>

      {/* Shift status card */}
      <View style={styles.card}>
        <View style={[styles.statusCircle, { backgroundColor: isActive ? '#d1fae5' : '#f3f4f6' }]}>
          <Text style={{ fontSize: 36 }}>{isActive ? '🟢' : '⚪'}</Text>
        </View>
        <Text style={styles.statusTitle}>
          {isActive ? 'Смена активна' : 'Смена завершена'}
        </Text>
        <Text style={styles.statusSub}>
          {isActive ? 'Вы принимаете заказы' : 'Начните смену чтобы принимать заказы'}
        </Text>

        <TouchableOpacity
          style={[isActive ? styles.btnDanger : styles.btnSuccess, toggling && styles.btnDisabled]}
          onPress={toggleShift}
          disabled={toggling}
        >
          <Text style={styles.btnText}>
            {toggling ? '...' : isActive ? 'Завершить смену' : 'Начать смену'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active order hint */}
      {activeOrder && (
        <View style={[styles.card, styles.activeOrderCard]}>
          <Text style={styles.activeOrderTitle}>У вас активный заказ</Text>
          <Text style={styles.activeOrderAddr}>Адрес: {activeOrder.address}</Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { alignSelf: 'flex-start', marginTop: 10 }]}
            onPress={() => navigation.navigate('ActiveOrder')}
          >
            <Text style={styles.btnText}>Перейти к заказу →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation cards */}
      {isActive && (
        <View style={styles.navCards}>
          <Pressable
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}
            onPress={() => navigation.navigate('AvailableOrders')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.navCardTitle}>Доступные заказы</Text>
              <Text style={styles.navCardSub}>Просмотреть и принять заказы</Text>
            </View>
            <Text style={{ fontSize: 24 }}>📦</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}
            onPress={() => navigation.navigate('ActiveOrder')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.navCardTitle}>Мой заказ</Text>
              <Text style={styles.navCardSub}>Текущая доставка</Text>
            </View>
            <Text style={{ fontSize: 24 }}>🚴</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  greeting: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  statusSub: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  activeOrderCard: {
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  activeOrderTitle: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
    color: '#111827',
  },
  activeOrderAddr: {
    fontSize: 13,
    color: '#6b7280',
  },
  navCards: {
    gap: 10,
  },
  navCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  navCardPressed: {
    shadowOpacity: 0.12,
    elevation: 4,
  },
  navCardTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: '#111827',
  },
  navCardSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnSuccess: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  btnDanger: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
