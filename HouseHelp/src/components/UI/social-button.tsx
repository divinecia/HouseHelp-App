import React from "react"
import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from "react-native"
import { AntDesign } from "@expo/vector-icons"

interface SocialButtonProps {
  provider: "google" | "apple" | "facebook"
  onPress: () => void
  style?: ViewStyle
}

export const SocialButton: React.FC<SocialButtonProps> = ({ provider, onPress, style }) => {
  const getIcon = () => {
    switch (provider) {
      case "google":
        return <AntDesign name="google" size={20} color="#EA4335" />
      case "apple":
        return <AntDesign name="apple1" size={20} color="#000" />
      case "facebook":
        return <AntDesign name="facebook-square" size={20} color="#1877F2" />
    }
  }

  const getLabel = () => {
    switch (provider) {
      case "google":
        return "Continue with Google"
      case "apple":
        return "Continue with Apple"
      case "facebook":
        return "Continue with Facebook"
    }
  }

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.7}>
      <div style={styles.iconContainer}>{getIcon()}</div>
      <Text style={styles.buttonText}>{getLabel()}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
})

