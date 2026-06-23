import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PersonalStackParamList } from './types';
import PersonalScreen from '../screens/PersonalScreen';
import AddPersonalExpenseScreen from '../screens/AddPersonalExpenseScreen';
import SetBudgetsScreen from '../screens/SetBudgetsScreen';

const Stack = createNativeStackNavigator<PersonalStackParamList>();

export default function PersonalStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PersonalMain"       component={PersonalScreen} />
      <Stack.Screen name="AddPersonalExpense" component={AddPersonalExpenseScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="SetBudgets"         component={SetBudgetsScreen}         options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
