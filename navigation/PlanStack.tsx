import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlanStackParamList } from './types';
import PlanScreen from '../screens/PlanScreen';
import CreatePlanScreen from '../screens/CreatePlanScreen';
import PlanDetailScreen from '../screens/PlanDetailScreen';
import EditTripScreen from '../screens/EditTripScreen';
import ItineraryScreen from '../screens/ItineraryScreen';
import PackingListScreen from '../screens/PackingListScreen';
import BudgetPlanScreen from '../screens/BudgetPlanScreen';
import ExploreScreen from '../screens/ExploreScreen';

const Stack = createNativeStackNavigator<PlanStackParamList>();

export default function PlanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlanScreen" component={PlanScreen} />
      <Stack.Screen
        name="CreatePlan"
        component={CreatePlanScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} />
      <Stack.Screen
        name="EditTrip"
        component={EditTripScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Itinerary" component={ItineraryScreen} />
      <Stack.Screen name="PackingList" component={PackingListScreen} />
      <Stack.Screen name="BudgetPlan" component={BudgetPlanScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
    </Stack.Navigator>
  );
}
