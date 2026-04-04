import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../api/client';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface Order {
  id: string;
  status: string;
  address: string;
  totalPrice: number;
  distanceKm?: number | null;
  deliveryFee?: number | null;
  createdAt: string;
  business: { name: string };
  tradingPoint?: { name: string; address: string } | null;
}

type Props = NativeStackScreenProps<RootStackParamList, 'CompletedDeliveries'>;

export default function CompletedDeliveriesScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api
        .get('/courier/orders')
        .then((r) => setOrders(r.data.filter((o: Order) => o.status === 'DONE')))
        .finally(() => setLoading(false));
    }, [])
  );

  const totalEarned = orders.reduce((sum, o) => sum + (o.deliveryFee ?? 0), 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        orders.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Всего доставок: {orders.length} • Заработано: {totalEarned.toFixed(0)} ₽
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
          <Text style={styles.grayText}>Выполненных доставок пока нет.</Text>
        </View>
      }
      renderItem={({ item: o }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.businessName}>{o.business.name}</Text>
              <Text style={[styles.grayText, { marginTop: 2 }]}>{o.address}</Text>
              {o.tradingPoint && (
                <Text style={[styles.grayText, { marginTop: 2 }]}>
                  Откуда: {o.tradingPoint.address}
                </Text>
              )}
              {o.distanceKm != null && (
                <Text style={[styles.grayText, { marginTop: 2 }]}>
                  Расстояние: {o.distanceKm} км
                </Text>
              )}
              <Text style={[styles.grayText, { marginTop: 4, fontSize: 11 }]}>
                {new Date(o.createdAt).toLocaleDateString('ru', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
              {o.deliveryFee != null && (
                <Text style={styles.fee}>+{o.deliveryFee.toFixed(0)} ₽</Text>
              )}
              <Text style={styles.orderPrice}>заказ {o.totalPrice.toFixed(0)} ₽</Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  list: {
    padding: 16,
    gap: 8,
    backgroundColor: '#f9fafb',
    flexGrow: 1,
  },
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  summaryText: {
    fontWeight: '700',
    color: '#15803d',
    fontSize: 14,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  businessName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111827',
  },
  grayText: {
    color: '#6b7280',
    fontSize: 13,
  },
  fee: {
    fontWeight: '700',
    fontSize: 16,
    color: '#16a34a',
  },
  orderPrice: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});
