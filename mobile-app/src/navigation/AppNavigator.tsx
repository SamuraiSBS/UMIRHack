import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ShiftControlScreen from '../screens/ShiftControlScreen';
import AvailableOrdersScreen from '../screens/AvailableOrdersScreen';
import ActiveOrderScreen from '../screens/ActiveOrderScreen';

export type RootStackParamList = {
  Login: undefined;
  ShiftControl: undefined;
  AvailableOrders: undefined;
  ActiveOrder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const headerStyle: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: '#2563eb' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

export default function AppNavigator() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={headerStyle}>
        {user ? (
          <>
            <Stack.Screen
              name="ShiftControl"
              component={ShiftControlScreen}
              options={{
                title: 'Панель курьера',
                headerBackVisible: false,
                headerRight: () => (
                  <TouchableOpacity onPress={logout} style={{ marginRight: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 15 }}>Выйти</Text>
                  </TouchableOpacity>
                ),
              }}
            />
            <Stack.Screen
              name="AvailableOrders"
              component={AvailableOrdersScreen}
              options={{ title: 'Доступные заказы' }}
            />
            <Stack.Screen
              name="ActiveOrder"
              component={ActiveOrderScreen}
              options={{ title: 'Мой заказ' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
