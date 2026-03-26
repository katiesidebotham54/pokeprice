import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { scanCard, fetchPricing } from "../api/client";
import { useCardStore } from "../store/useCardStore";
import { RootStackParamList } from "../../App";
import { theme } from "../theme";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Camera">;
};

type ScanState = "idle" | "scanning" | "detected";

const { width: SCREEN_W } = Dimensions.get("window");

// Standard Pokémon card: 63×88mm → ratio ~1:1.397
const CARD_W = SCREEN_W * 0.72;
const CARD_H = CARD_W * 1.397;

// Card zones shown when card is detected
type CardZone = { label: string; top?: string; bottom?: string };
const CARD_ZONES: CardZone[] = [
  { label: "Name · HP · Type", top: "11%" },
  { label: "Card Art", top: "38%" },
  { label: "Attacks", top: "63%" },
  { label: "Set · Number", bottom: "8%" },
];

export default function CameraScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const cameraRef = useRef<CameraView>(null);
  const { setLoading, setError, setCard, setPricing, setImageUri, reset } = useCardStore();

  // Scan line animation (always loops)
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  // Zone label opacity (fades in when detected)
  const zoneOpacity = useRef(new Animated.Value(0)).current;

  const detectTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Detection state machine
  function startDetectionCycle() {
    detectTimers.current.forEach(clearTimeout);
    const t1 = setTimeout(() => setScanState("scanning"), 800);
    const t2 = setTimeout(() => setScanState("detected"), 2800);
    // Auto-cycle: re-scan after 5s in "detected" to feel alive
    const t3 = setTimeout(() => {
      setScanState("scanning");
      const t4 = setTimeout(() => setScanState("detected"), 2000);
      detectTimers.current = [t4];
    }, 7800);
    detectTimers.current = [t1, t2, t3];
  }

  useEffect(() => {
    if (!permission?.granted) return;
    startDetectionCycle();
    return () => detectTimers.current.forEach(clearTimeout);
  }, [permission?.granted]);

  // Scan line animation — continuous loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Zone label fade when state changes
  useEffect(() => {
    Animated.timing(zoneOpacity, {
      toValue: scanState === "detected" ? 1 : 0,
      duration: scanState === "detected" ? 450 : 200,
      useNativeDriver: true,
    }).start();
  }, [scanState]);

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CARD_H - 2],
  });

  // Dynamic colors based on scan state
  const cornerColor =
    scanState === "detected"
      ? theme.green
      : scanState === "scanning"
      ? theme.blue
      : "rgba(255,255,255,0.3)";

  const outlineColor =
    scanState === "detected"
      ? theme.green
      : scanState === "scanning"
      ? theme.blue
      : "rgba(255,255,255,0.2)";

  const scanBeamColor =
    scanState === "detected" ? theme.green : theme.blue;

  async function handleCapture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    // Reset detection feedback on new capture
    detectTimers.current.forEach(clearTimeout);
    setScanState("scanning");

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error("No photo captured");

      reset();
      setImageUri(photo.uri);
      setLoading(true);
      navigation.goBack();

      const card = await scanCard(photo.uri);

      if (card.confidence < 0.3) {
        Alert.alert(
          "Low confidence",
          `Best guess: ${card.name}. Try a clearer photo.`,
          [
            {
              text: "Use anyway",
              onPress: () => {
                setCard(card);
                setLoading(false);
                navigation.navigate("Result");
                fetchPricing(card.name, card.set, card.number)
                  .then(setPricing)
                  .catch(() => {});
              },
            },
            { text: "Retry", onPress: () => setLoading(false) },
          ]
        );
        return;
      }

      setCard(card);
      try {
        setPricing(await fetchPricing(card.name, card.set, card.number));
      } catch {}
      setLoading(false);
      navigation.navigate("Result");
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      Alert.alert("Scan failed", msg);
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Camera access is required to scan cards.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={styles.backText}>‹ Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash={flash} />

      {/* Dark overlay with transparent card window */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />

          {/* Card detection window */}
          <View style={[styles.cardOutline, { borderColor: outlineColor }]}>

            {/* Animated scan beam (sweeps top → bottom) */}
            {scanState !== "idle" && (
              <Animated.View
                pointerEvents="none"
                style={[styles.scanBeamWrapper, { transform: [{ translateY: scanLineY }] }]}
              >
                <View style={[styles.scanBeamGlow, { backgroundColor: scanBeamColor }]} />
                <View style={[styles.scanBeamLine, { backgroundColor: scanBeamColor }]} />
                <View style={[styles.scanBeamGlow, { backgroundColor: scanBeamColor }]} />
              </Animated.View>
            )}

            {/* Zone detection labels (fade in when card detected) */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { opacity: zoneOpacity }]}
            >
              {CARD_ZONES.map((zone, i) => (
                <View
                  key={i}
                  style={[
                    styles.zoneRow,
                    { top: zone.top as any, bottom: zone.bottom as any },
                  ]}
                >
                  <View style={styles.zoneDash} />
                  <Text style={styles.zoneLabel}>{zone.label}</Text>
                  <View style={styles.zoneDash} />
                </View>
              ))}
            </Animated.View>

            {/* Corner brackets — color reflects scan state */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: cornerColor }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: cornerColor }]} />
          </View>

          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Status badge — sits just below the card window */}
      <View style={styles.statusContainer} pointerEvents="none">
        {capturing ? (
          <View style={styles.capturingBadge}>
            <Text style={styles.capturingText}>SCANNING...</Text>
          </View>
        ) : scanState === "detected" ? (
          <View style={styles.detectedBadge}>
            <Text style={styles.detectedText}>✓  Card Detected</Text>
          </View>
        ) : scanState === "scanning" ? (
          <View style={styles.scanningBadge}>
            <Text style={styles.scanningText}>Detecting card...</Text>
          </View>
        ) : (
          <View style={styles.guidePill}>
            <Text style={styles.guideText}>Align card within the frame</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <SafeAreaView style={styles.controls}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        {/* Pokeball-style shutter button */}
        <TouchableOpacity
          style={[styles.shutterBtn, capturing && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={capturing}
          activeOpacity={0.85}
        >
          <View style={styles.shutterTop} />
          <View style={styles.shutterDivider} />
          <View style={styles.shutterBottom} />
          <View style={[
            styles.shutterCenter,
            scanState === "detected" && styles.shutterCenterReady,
          ]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.flashBtn}
          onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
        >
          <Text style={[styles.flashIcon, flash === "on" && styles.flashIconOn]}>⚡</Text>
          <Text style={[styles.flashLabel, flash === "on" && styles.flashLabelOn]}>
            {flash === "on" ? "On" : "Off"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const SHUTTER = 72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Dark overlay
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  overlayMiddleRow: { flexDirection: "row", height: CARD_H },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  overlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },

  // Card detection window
  cardOutline: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
  },

  // Corner brackets
  corner: { position: "absolute", width: 24, height: 24 },
  cornerTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderRadius: 12 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderRadius: 12 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderRadius: 12 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderRadius: 12 },

  // Scan beam
  scanBeamWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  scanBeamGlow: {
    height: 12,
    opacity: 0.15,
  },
  scanBeamLine: {
    height: 2,
    opacity: 0.9,
  },

  // Zone detection rows
  zoneRow: {
    position: "absolute",
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  zoneDash: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(76, 184, 122, 0.5)",
  },
  zoneLabel: {
    color: "rgba(76, 184, 122, 0.95)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Status badge
  statusContainer: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    marginTop: CARD_H / 2 + 14,
    alignItems: "center",
  },
  guidePill: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  guideText: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "500" },

  scanningBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${theme.blue}66`,
  },
  scanningText: { color: theme.blue, fontSize: 12, fontWeight: "600" },

  detectedBadge: {
    backgroundColor: "rgba(76, 184, 122, 0.15)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: theme.green,
  },
  detectedText: { color: theme.green, fontSize: 13, fontWeight: "700" },

  capturingBadge: {
    backgroundColor: theme.yellow,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  capturingText: { color: theme.dark, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },

  // Controls bar
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  cancelBtn: { width: 64, alignItems: "flex-start" },
  cancelText: { color: "#fff", fontSize: 16, fontWeight: "500" },

  // Pokeball shutter button
  shutterBtn: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 3,
    borderColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterTop: { height: SHUTTER / 2, width: SHUTTER, backgroundColor: "#EF4444" },
  shutterDivider: { height: 3, width: SHUTTER, backgroundColor: "#fff" },
  shutterBottom: { height: SHUTTER / 2, width: SHUTTER, backgroundColor: "#fff" },
  shutterCenter: {
    position: "absolute",
    width: SHUTTER * 0.32,
    height: SHUTTER * 0.32,
    borderRadius: SHUTTER * 0.16,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#1E293B",
  },
  shutterCenterReady: {
    backgroundColor: theme.green,
    borderColor: "#fff",
  },
  shutterDisabled: { opacity: 0.5 },

  flashBtn: { width: 64, alignItems: "center", gap: 3 },
  flashIcon: { fontSize: 22, opacity: 0.45 },
  flashIconOn: { opacity: 1 },
  flashLabel: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "600" },
  flashLabelOn: { color: theme.yellow },

  permissionText: { color: "#fff", fontSize: 15, textAlign: "center", margin: 32 },
  permissionBtn: {
    backgroundColor: theme.yellow,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginHorizontal: 32,
  },
  permissionBtnText: { color: theme.dark, fontWeight: "700", fontSize: 15, textAlign: "center" },
  backText: { color: "rgba(255,255,255,0.65)", textAlign: "center", fontSize: 15, fontWeight: "500" },
});
