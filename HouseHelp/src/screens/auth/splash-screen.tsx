"use client"

import React, { useEffect } from "react"
import { View, Image, StyleSheet, Animated, Dimensions } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../../contexts/auth-context"

const { width, height } = Dimensions.get("window")

export const SplashScreen = () => {
  const { user, loading } = useAuth()
  const navigation = useNavigation()
  const fadeAnim = React.useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start()

    // Minimum display time for splash screen
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          navigation.reset({
            index: 0,
            routes: [{ name: "Home" }],
          })
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        }
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [loading, user, navigation])

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    width: width * 0.6,
    height: height * 0.2,
  },
})

