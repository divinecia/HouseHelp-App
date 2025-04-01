"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { AuthNavigator } from "./auth-navigator"
import { HomeScreen } from "../screens/home/home-screen"
import { useAuth } from "../contexts/auth-context"

const Stack = createStackNavigator()

export const RootNavigator = () => {
  const { user, loading } = useAuth()

  if (loading) {
    // You could return a loading screen here if needed
    return null
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainApp" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

