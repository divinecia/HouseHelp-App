import type React from "react"
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from "@expo/vector-icons"
import type { WorkerProfile, ServiceType } from "../../types/worker"
import { RatingStars } from "../UI/rating-stars"
import { COLORS, SIZES } from "../../config/theme"

interface WorkerCardProps {
  worker: WorkerProfile
  onPress: (worker: WorkerProfile) => void
  distance?: number // in kilometers
}

export const WorkerCard: React.FC<WorkerCardProps> = ({ worker, onPress, distance }) => {
  const getServiceIcon = (service: ServiceType) => {
    switch (service) {
      case "cleaning":
        return "trash-2"
      case "cooking":
        return "coffee"
      case "childcare":
        return "users"
      case "eldercare":
        return "heart"
      case "gardening":
        return "scissors"
      case "driving":
        return "truck"
      case "security":
        return "shield"
      case "laundry":
        return "wind"
      case "petcare":
        return "github" // Using as a placeholder for pet
      case "tutoring":
        return "book"
      default:
        return "briefcase"
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(worker)} activeOpacity={0.7}>
      <View style={styles.header}>
        <Image
          source={worker.profile_image ? { uri: worker.profile_image } : require("../../assets/default-avatar.png")}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{worker.full_name}</Text>
            {worker.verified && (
              <Feather name="check-circle" size={16} color={COLORS.primary} style={styles.verifiedIcon} />
            )}
          </View>
          <View style={styles.ratingContainer}>
            <RatingStars rating={worker.rating} size={14} />
            <Text style={styles.ratingText}>({worker.total_ratings})</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${worker.hourly_rate}/hr</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Feather name="briefcase" size={14} color={COLORS.textLight} />
          <Text style={styles.infoText}>{worker.experience_years} years</Text>
        </View>
        {distance !== undefined && (
          <View style={styles.infoItem}>
            <Feather name="map-pin" size={14} color={COLORS.textLight} />
            <Text style={styles.infoText}>{distance.toFixed(1)} km</Text>
          </View>
        )}
        <View style={styles.infoItem}>
          <Feather name="globe" size={14} color={COLORS.textLight} />
          <Text style={styles.infoText}>
            {worker.languages.slice(0, 2).join(", ")}
            {worker.languages.length > 2 ? "..." : ""}
          </Text>
        </View>
      </View>

      <View style={styles.servicesContainer}>
        {worker.services.slice(0, 5).map((service, index) => (
          <View key={index} style={styles.serviceItem}>
            <Feather name={getServiceIcon(service)} size={14} color={COLORS.primary} />
            <Text style={styles.serviceText}>{service.charAt(0).toUpperCase() + service.slice(1)}</Text>
          </View>
        ))}
        {worker.services.length > 5 && (
          <View style={styles.serviceItem}>
            <Text style={styles.moreText}>+{worker.services.length - 5} more</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    marginBottom: SIZES.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: SIZES.md,
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  priceContainer: {
    justifyContent: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: SIZES.md,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SIZES.md,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: SIZES.xs,
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    marginRight: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  serviceText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  moreText: {
    fontSize: 12,
    color: COLORS.primary,
  },
})

