import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../api/client';
import type { RootStackParamList } from '../navigation/AppNavigator';

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Принят — едете к точке выдачи',
  DELIVERING: 'В пути к клиенту',
  DONE: 'Доставлен',
};

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  ACCEPTED: { status: 'DELIVERING', label: 'Забрал заказ — везу клиенту' },
  DELIVERING: { status: 'DONE', label: 'Доставил заказ' },
};

interface OrderItem {
  id: string;
  quantity: number;
  product: { name: string; price: number };
}

interface Order {
  id: string;
  status: string;
  address: string;
  totalPrice: number;
  items: OrderItem[];
  business: { name: string };
  customer?: { name?: string; email: string };
}

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveOrder'>;

export default function ActiveOrderScreen({ navigation }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return api.get('/courier/orders').then((r) => {
      const active = r.data.find(
        (o: Order) => o.status === 'ACCEPTED' || o.status === 'DELIVERING'
      );
      const done = r.data.filter((o: Order) => o.status === 'DONE');
      setOrder(active || null);
      setHistory(done);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function updateStatus() {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setUpdating(true);
    setError('');
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next.status });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка обновления статуса');
    } finally {
      setUpdating(false);
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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!order ? (
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
          <Text style={styles.grayText}>Нет активного заказа.</Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 16 }]}
            onPress={() => navigation.navigate('AvailableOrders')}
          >
            <Text style={styles.btnText}>Смотреть доступные заказы</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          {/* Status */}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{STATUS_LABELS[order.status]}</Text>
          </View>

          {/* Business */}
          <Text style={styles.label}>Ресторан / магазин</Text>
          <Text style={styles.value}>{order.business.name}</Text>

          {/* Address */}
          <Text style={styles.label}>Адрес доставки</Text>
          <Text style={[styles.value, { color: '#111827' }]}>{order.address}</Text>

          {/* Customer */}
          <Text style={styles.label}>Клиент</Text>
          <Text style={styles.value}>
            {order.customer?.name || order.customer?.email}
          </Text>

          {/* Items */}
          <View style={styles.divider} />
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product.name} × {item.quantity}</Text>
              <Text style={styles.itemPrice}>
                {(item.product.price * item.quantity).toFixed(0)} ₽
              </Text>
            </View>
          ))}
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Итого</Text>
            <Text style={styles.totalPrice}>{order.totalPrice.toFixed(0)} ₽</Text>
          </View>

          {/* Action button */}
          {NEXT_STATUS[order.status] && (
            <TouchableOpacity
              style={[styles.btnSuccess, updating && styles.btnDisabled, { marginTop: 14 }]}
              disabled={updating}
              onPress={updateStatus}
            >
              <Text style={styles.btnText}>
                {updating ? 'Обновляем...' : NEXT_STATUS[order.status].label}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <Text style={styles.historyTitle}>Выполненные сегодня</Text>
          {history.map((o) => (
            <View key={o.id} style={[styles.card, styles.historyCard]}>
              <View style={styles.itemRow}>
                <Text style={styles.businessName}>{o.business.name}</Text>
                <Text style={styles.historyPrice}>{o.totalPrice.toFixed(0)} ₽</Text>
              </View>
              <Text style={styles.grayText}>{o.address}</Text>
            </View>
          ))}
        </>
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
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
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
  statusBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  statusText: {
    fontWeight: '700',
    color: '#1d4ed8',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  value: {
    fontWeight: '600',
    fontSize: 15,
    color: '#374151',
    marginBottom: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: '#374151',
  },
  totalLabel: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111827',
  },
  totalPrice: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111827',
  },
  grayText: {
    color: '#6b7280',
    fontSize: 13,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111827',
  },
  historyCard: {
    opacity: 0.85,
    marginBottom: 8,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historyPrice: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  btnSuccess: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
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
