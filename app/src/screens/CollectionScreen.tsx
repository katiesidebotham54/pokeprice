import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCollectionStore, SavedCard } from "../store/useCollectionStore";
import { RootStackParamList } from "../../App";
import { theme } from "../theme";
import Pokeball from "../components/Pokeball";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Collection">;
};

function formatPrice(p: number | null) {
  return p != null ? `$${p.toFixed(2)}` : "—";
}

function CardRow({ card, onRemove }: { card: SavedCard; onRemove: () => void }) {
  return (
    <View style={[styles.row, theme.shadowSm]}>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.thumb} resizeMode="contain" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Pokeball size={32} />
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.rowSet} numberOfLines={1}>
          {card.set}  ·  #{card.number}
        </Text>
        <Text style={styles.rowRarity} numberOfLines={1}>
          {card.rarity}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowPrice}>{formatPrice(card.lastPrice)}</Text>
        <Text style={styles.rowDate}>{new Date(card.savedAt).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CollectionScreen({ navigation }: Props) {
  const { cards, loaded, load, remove } = useCollectionStore();

  useEffect(() => {
    if (!loaded) load();
  }, []);

  function confirmRemove(card: SavedCard) {
    Alert.alert("Remove card", `Remove ${card.name} from your collection?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => remove(card.id) },
    ]);
  }

  const totalValue = cards.reduce((sum, c) => sum + (c.lastPrice ?? 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <Pokeball size={20} />
          <Text style={styles.headerLogo}>
            <Text style={{ color: theme.blue }}>Poke</Text>
            <Text style={{ color: theme.green }}>Price</Text>
          </Text>
        </View>
        <View style={{ width: 64 }} />
      </View>

      <Text style={styles.pageTitle}>My Collection</Text>

      {/* Summary card */}
      {cards.length > 0 && (
        <View style={[styles.summaryCard, theme.shadow]}>
          <View style={styles.summaryItem}>
            <Pokeball size={24} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Cards</Text>
              <Text style={styles.summaryValue}>{cards.length}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValueIcon}>💰</Text>
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Est. Value</Text>
              <Text style={[styles.summaryValue, { color: theme.yellow }]}>
                ${totalValue.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Empty state */}
      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Image
            source={require("../../assets/icon4.png")}
            style={styles.emptyIcon}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptySub}>
            Save a card from your scan results to start building your collection
          </Text>
          <TouchableOpacity
            style={[styles.scanBtn, theme.shadow]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.scanBtnText}>Scan a Card</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CardRow card={item} onRemove={() => confirmRemove(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8, minWidth: 64 },
  backText: { color: theme.blue, fontSize: 17, fontWeight: "600" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerLogo: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },

  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.textPrimary,
    paddingHorizontal: 20,
    paddingBottom: 12,
    letterSpacing: -0.3,
  },

  // Summary
  summaryCard: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  summaryItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  summaryText: { gap: 2 },
  summaryValueIcon: { fontSize: 24 },
  summaryLabel: { color: theme.textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: "800", color: theme.textPrimary, fontVariant: ["tabular-nums"] },
  summaryDivider: { width: 1, height: 36, backgroundColor: theme.border, marginHorizontal: 8 },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  thumb: { width: 54, height: 76, borderRadius: 8 },
  thumbPlaceholder: {
    backgroundColor: theme.bgAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { color: theme.textPrimary, fontSize: 15, fontWeight: "600" },
  rowSet: { color: theme.textSecondary, fontSize: 12 },
  rowRarity: { color: theme.textMuted, fontSize: 11 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  rowPrice: { fontSize: 16, fontWeight: "700", color: theme.yellow, fontVariant: ["tabular-nums"] },
  rowDate: { color: theme.textMuted, fontSize: 11 },
  removeBtn: { marginTop: 4, paddingVertical: 2 },
  removeText: { color: theme.red, fontSize: 11, fontWeight: "600", opacity: 0.8 },

  // Empty state
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 14 },
  emptyIcon: { width: 160, height: 160, marginBottom: 4 },
  emptyTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: "700" },
  emptySub: {
    color: theme.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  scanBtn: {
    marginTop: 6,
    backgroundColor: theme.yellow,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanBtnText: { color: theme.dark, fontWeight: "700", fontSize: 15 },
});
