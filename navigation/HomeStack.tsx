import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import CreateSubgroupScreen from '../screens/CreateSubgroupScreen';
import EditTripScreen from '../screens/EditTripScreen';
import ItineraryScreen from '../screens/ItineraryScreen';
import PackingListScreen from '../screens/PackingListScreen';
import BudgetPlanScreen from '../screens/BudgetPlanScreen';
import MemberExpensesScreen from '../screens/MemberExpensesScreen';
import ExploreScreen from '../screens/ExploreScreen';
import TripWizardScreen from '../screens/TripWizardScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="SettleUp"
        component={SettleUpScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="CreateSubgroup"
        component={CreateSubgroupScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditTrip"
        component={EditTripScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Itinerary" component={ItineraryScreen} />
      <Stack.Screen name="PackingList" component={PackingListScreen} />
      <Stack.Screen name="BudgetPlan" component={BudgetPlanScreen} />
      <Stack.Screen name="MemberExpenses" component={MemberExpensesScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
      <Stack.Screen name="TripWizard" component={TripWizardScreen} />
    </Stack.Navigator>
  );
}
