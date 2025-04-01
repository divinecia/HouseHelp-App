import { createStackNavigator } from "@react-navigation/stack"
import { SplashScreen } from "../screens/auth/splash-screen"
import { LoginScreen } from "../screens/auth/login-screen"
import { RegisterScreen } from "../screens/auth/register-screen"
import { ForgotPasswordScreen } from "../screens/auth/forgot-password-screen"

const Stack = createStackNavigator()

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  )
}

