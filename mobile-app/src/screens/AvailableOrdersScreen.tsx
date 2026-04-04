import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../api/client';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface OrderItem {
  id: string;
  quantity: number;
  product: { name: string };
}

interface Order {
  id: string;
  totalPrice: number;
  distanceKm?: number | null;
  deliveryFee?: number | null;
  items: OrderItem[];
  business: { name: string };
  tradingPoint?: { name: string; address: string } | null;
}

type Props = NativeStackScreenProps<RootStackParamList, 'AvailableOrders'>;

export default function AvailableOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shiftActive, setShiftActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return Promise.all([
      api.get('/orders/available').then((r) => setOrders(r.data)),
      api.get('/courier/shift').then((r) => setShiftActive(r.data.isActive ?? false)),
    ]).catch((err) => setError(err.response?.data?.error || 'Ошибка загрузки'));
  }, []);

  // Auto-refresh every 8s, only while screen is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));

      const interval = setInterval(load, 8000);
      return () => clearInterval(interval);
    }, [load])
  );

  async function handleManualRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAccept(orderId: string) {
    setAccepting(orderId);
    setError('');
    try {
      await api.post(`/orders/${orderId}/accept`);
      navigation.replace('ActiveOrder');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось принять заказ');
      setAccepting(null);
      load();
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
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!shiftActive && (
        <View style={styles.shiftBanner}>
          <Text style={styles.shiftBannerText}>⚠️ Смена не активна — принятие заказов недоступно</Text>
        </View>
      )}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleManualRefresh} colors={['#2563eb']} />
        }
        ListEmptyComponent={
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
            <Text style={styles.grayText}>Пока нет доступных заказов. Обновляем каждые 8 сек...</Text>
          </View>
        }
        renderItem={({ item: order }) => {
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
          const preview = order.items.slice(0, 3);
          const extra = order.items.length - 3;

          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.businessName}>{order.business.name}</Text>
                  <Text style={[styles.grayText, { marginTop: 4 }]}>
                    {itemCount} товар(ов) • {order.totalPrice.toFixed(0)} ₽
                  </Text>
                  <Text style={[styles.smallText, { marginTop: 6 }]}>
                    <Text style={{ fontWeight: '600' }}>Откуда:</Text>{' '}
                    {order.tradingPoint
                      ? `${order.tradingPoint.name} — ${order.tradingPoint.address}`
                      : order.business.name}
                  </Text>
                  {order.distanceKm != null && (
                    <Text style={[styles.grayText, { marginTop: 2, fontSize: 12 }]}>
                      Расстояние: {order.distanceKm} км
                    </Text>
                  )}
                  <Text style={[styles.grayText, { marginTop: 2, fontSize: 12 }]}>
                    Заказ #{order.id.slice(-6).toUpperCase()}
                  </Text>
                  <Text style={styles.previewText}>
                    {preview.map((item, i) => (
                      `${item.product.name} ×${item.quantity}${i < preview.length - 1 ? ', ' : ''}`
                    )).join('')}
                    {extra > 0 ? ` и ещё ${extra}...` : ''}
                  </Text>
                </View>

                <View style={styles.cardRight}>
                  {order.deliveryFee != null ? (
                    <>
                      <Text style={styles.price}>+{order.deliveryFee.toFixed(0)} ₽</Text>
                      <Text style={[styles.grayText, { fontSize: 11, marginBottom: 8 }]}>
                        заказ {order.totalPrice.toFixed(0)} ₽
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.price}>{order.totalPrice.toFixed(0)} ₽</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.btnPrimary, (!shiftActive || accepting === order.id) && styles.btnDisabled]}
                    disabled={!shiftActive || accepting === order.id}
                    onPress={() => handleAccept(order.id)}
                  >
                    <Text style={styles.btnText}>
                      {accepting === order.id ? '...' : 'Принять'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    padding: 12,
    textAlign: 'center',
  },
  shiftBanner: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
    padding: 12,
  },
  shiftBannerText: {
    color: '#92400e',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  businessName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111827',
  },
  grayText: {
    color: '#6b7280',
    fontSize: 13,
  },
  smallText: {
    fontSize: 13,
    color: '#374151',
  },
  previewText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  cardRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  price: {
    fontWeight: '700',
    fontSize: 18,
    color: '#16a34a',
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
