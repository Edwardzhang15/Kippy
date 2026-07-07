import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PersonalStackParamList } from './types';
import PersonalScreen from '../screens/PersonalScreen';
import CreatePersonalTripScreen from '../screens/CreatePersonalTripScreen';
import PersonalTripDetailScreen from '../screens/PersonalTripDetailScreen';
import AddPersonalTripExpenseScreen from '../screens/AddPersonalTripExpenseScreen';
import ManageCategoryBudgetsScreen from '../screens/ManageCategoryBudgetsScreen';
import PaywallScreen from '../screens/PaywallScreen';

const Stack = createNativeStackNavigator<PersonalStackParamList>();

export default function PersonalStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PersonalMain"           component={PersonalScreen} />
      <Stack.Screen name="CreatePersonalTrip"     component={CreatePersonalTripScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="PersonalTripDetail"     component={PersonalTripDetailScreen} />
      <Stack.Screen name="AddPersonalTripExpense" component={AddPersonalTripExpenseScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ManageCategoryBudgets"  component={ManageCategoryBudgetsScreen} />
      <Stack.Screen name="Paywall"                component={PaywallScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
