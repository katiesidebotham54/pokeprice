import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { scanCard, fetchPricing } from "../api/client";
import { useCardStore } from "../store/useCardStore";
import { useCollectionStore } from "../store/useCollectionStore";
import { RootStackParamList } from "../../App";
import { theme } from "../theme";
import Pokeball from "../components/Pokeball";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export default function HomeScreen({ navigation }: Props) {
  const { loading, setLoading, setError, setCard, setPricing, setImageUri, reset } =
    useCardStore();
  const { load: loadCollection, cards } = useCollectionStore();

  useEffect(() => {
    loadCollection();
  }, []);

  async function handleGallery() {
    reset();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow gallery access to continue.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setLoading(true);
    setError(null);

    try {
      const card = await scanCard(uri);
      if (card.confidence < 0.3) {
        Alert.alert(
          "Low confidence",
          `Best guess: ${card.name}. Try a clearer photo.`,
          [
            { text: "Use anyway", onPress: () => proceed(card, uri) },
            { text: "Retry", onPress: () => setLoading(false) },
          ]
        );
        return;
      }
      await proceed(card, uri);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setLoading(false);
      Alert.alert("Scan failed", msg);
    }
  }

  async function proceed(card: Awaited<ReturnType<typeof scanCard>>, uri: string) {
    setCard(card);
    setImageUri(uri);
    setLoading(false);
    // Navigate immediately — pricing loads in the background and updates the store
    navigation.navigate("Result");
    fetchPricing(card.name, card.set, card.number)
      .then(setPricing)
      .catch(() => {});
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Subtle background decorations */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={[styles.decoBall, { top: -56, right: -56 }]} />
        <View style={[styles.decoBall, styles.decoBallSm, { bottom: 140, left: -48 }]} />
        <Text style={[styles.decoStar, { top: 92, left: 36 }]}>✦</Text>
        <Text style={[styles.decoStar, { top: 152, right: 52, fontSize: 9 }]}>✦</Text>
        <Text style={[styles.decoStar, { bottom: 210, right: 32, fontSize: 7 }]}>✦</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Pokeball size={30} />
          <Text style={styles.logo}>
            <Text style={{ color: theme.blue }}>Poke</Text>
            <Text style={{ color: theme.green }}>Price</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.collectionBtn}
          onPress={() => navigation.navigate("Collection")}
          activeOpacity={0.7}
        >
          <View style={styles.collectionPill}>
            <Pokeball size={18} />
            <Text style={styles.collectionLabel}>
              {cards.length > 0 ? `${cards.length}` : "0"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.tagline}>Instant Pokémon card pricing</Text>

      {/* Scan frame */}
      <View style={styles.scanArea}>
        <View style={[styles.cardFrame, theme.shadow]}>
          {/* Blue corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.blue} />
              <View style={styles.scanningBadge}>
                <Text style={styles.scanningText}>IDENTIFYING...</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContent}>
              <Image
                source={require("../../assets/icon3.png")}
                style={styles.placeholderIcon}
                resizeMode="contain"
              />
              <Text style={styles.placeholderText}>Ready to scan</Text>
              <Text style={styles.placeholderSub}>Point camera at any Pokémon card</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, theme.shadow, loading && styles.buttonDisabled]}
          onPress={() => navigation.navigate("Camera")}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Scan Card</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, theme.shadowSm, loading && styles.buttonDisabled]}
          onPress={handleGallery}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Upload from Gallery</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  // Background decoration
  decoBall: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 36,
    borderColor: "rgba(75,144,220,0.06)",
    backgroundColor: "rgba(75,144,220,0.025)",
  },
  decoBallSm: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 24,
  },
  decoStar: {
    position: "absolute",
    fontSize: 12,
    color: theme.yellow,
    opacity: 0.45,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { fontSize: 27, fontWeight: "800", letterSpacing: -0.5 },

  collectionBtn: {},
  collectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  collectionLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  tagline: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 6,
  },

  // Scan area
  scanArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  cardFrame: {
    width: "100%",
    aspectRatio: 3 / 4,
    maxHeight: 370,
    backgroundColor: theme.surface,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.blue,
    position: "relative",
  },

  // Corner brackets
  corner: { position: "absolute", width: 24, height: 24 },
  cornerTL: {
    top: -2, left: -2,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderColor: theme.blue, borderRadius: 12,
  },
  cornerTR: {
    top: -2, right: -2,
    borderTopWidth: 3, borderRightWidth: 3,
    borderColor: theme.blue, borderRadius: 12,
  },
  cornerBL: {
    bottom: -2, left: -2,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderColor: theme.blue, borderRadius: 12,
  },
  cornerBR: {
    bottom: -2, right: -2,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderColor: theme.blue, borderRadius: 12,
  },

  // Loading / placeholder
  loadingContainer: { alignItems: "center", gap: 18 },
  scanningBadge: {
    backgroundColor: theme.yellow,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  scanningText: { color: theme.dark, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },

  placeholderContent: { alignItems: "center", gap: 12 },
  placeholderIcon: { width: 130, height: 130 },
  placeholderText: { color: theme.textPrimary, fontSize: 16, fontWeight: "600" },
  placeholderSub: { color: theme.textMuted, fontSize: 13, textAlign: "center" },

  // Buttons
  actions: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  primaryButton: {
    backgroundColor: theme.yellow,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: theme.dark, fontWeight: "700", fontSize: 16 },

  secondaryButton: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  secondaryButtonText: { color: theme.textSecondary, fontWeight: "600", fontSize: 15 },

  buttonDisabled: { opacity: 0.5 },
});
