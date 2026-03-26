import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCardStore } from "../store/useCardStore";
import { useCollectionStore } from "../store/useCollectionStore";
import { RootStackParamList } from "../../App";
import { EbaySale, GradedPrice, PriceChartingPrices } from "../api/client";
import { theme } from "../theme";
import Pokeball from "../components/Pokeball";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Result">;
};

const TREND_ICONS = { up: "↑", down: "↓", stable: "→" } as const;
const TREND_COLORS = {
  up: theme.trendUp,
  down: theme.trendDown,
  stable: theme.trendStable,
} as const;

function fmt(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}

function SkeletonBox({ width, height }: { width: number | string; height: number }) {
  return <View style={[styles.skeleton, { width: width as number, height }]} />;
}

// ─── Ungraded source chip ────────────────────────────────────────────────────
function SourceChip({
  label,
  price,
  accent,
  loading,
}: {
  label: string;
  price: number | null;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <View style={[styles.sourceChip, accent && styles.sourceChipAccent]}>
      <Text style={[styles.sourceChipLabel, accent && styles.sourceChipLabelAccent]}>
        {label}
      </Text>
      {loading ? (
        <SkeletonBox width={48} height={16} />
      ) : (
        <Text style={[styles.sourceChipPrice, accent && styles.sourceChipPriceAccent]}>
          {fmt(price)}
        </Text>
      )}
    </View>
  );
}

// ─── Graded price bubble ─────────────────────────────────────────────────────
function GradeBubble({
  label,
  ebayPrice,
  pcPrice,
  featured,
}: {
  label: string;
  ebayPrice: number | null;
  pcPrice: number | null;
  featured?: boolean;
}) {
  const display = ebayPrice ?? pcPrice;
  const hasEbay = ebayPrice != null;
  const hasBoth = ebayPrice != null && pcPrice != null;

  return (
    <View style={[styles.gradeBubble, featured && styles.gradeBubbleFeatured]}>
      <Text style={[styles.gradeLabel, featured && styles.gradeLabelFeatured]}>{label}</Text>
      <Text style={[styles.gradePrice, featured && styles.gradePriceFeatured]}>
        {fmt(display)}
      </Text>
      {hasBoth && (
        <Text style={styles.gradePcRef}>PC: {fmt(pcPrice)}</Text>
      )}
      {display != null && (
        <Text style={styles.gradeSource}>{hasEbay ? "eBay sold" : "PriceCharting"}</Text>
      )}
    </View>
  );
}

export default function ResultScreen({ navigation }: Props) {
  const { card, pricing, imageUri } = useCardStore();
  const { save, remove, has } = useCollectionStore();
  const [showAllSales, setShowAllSales] = useState(false);

  const cardId = pricing?.cardMeta?.id ?? `${card?.name}-${card?.number}`;
  const isSaved = card ? has(cardId) : false;

  function toggleSave() {
    if (!card) return;
    if (isSaved) {
      remove(cardId);
    } else {
      save({
        id: cardId,
        name: card.name,
        set: card.set,
        number: card.number,
        rarity: card.rarity,
        imageUrl: pricing?.cardMeta?.imageUrl ?? null,
        tcgplayerUrl: pricing?.cardMeta?.tcgplayerUrl ?? null,
        lastPrice: pricing?.median ?? null,
        savedAt: new Date().toISOString(),
      });
    }
  }

  if (!card) {
    navigation.goBack();
    return null;
  }

  const sales: EbaySale[] = pricing?.ebay.recentSales ?? [];
  const displaySales = showAllSales ? sales : sales.slice(0, 5);
  const pc: PriceChartingPrices | null = pricing?.pricecharting ?? null;

  // Build graded data: merge eBay PSA sales with PriceCharting graded reference
  const gradedRows: { label: string; grade: number; ebay: number | null; pc: number | null }[] = [
    { label: "PSA 10",  grade: 10,  ebay: pricing?.graded.find(g => g.grade === 10)?.median ?? null,  pc: pc?.psa10 ?? null },
    { label: "PSA 9.5", grade: 9.5, ebay: pricing?.graded.find(g => g.grade === 9.5)?.median ?? null, pc: pc?.psa95 ?? null },
    { label: "PSA 9",   grade: 9,   ebay: pricing?.graded.find(g => g.grade === 9)?.median ?? null,   pc: pc?.psa9 ?? null },
    { label: "PSA 8.5", grade: 8.5, ebay: pricing?.graded.find(g => g.grade === 8.5)?.median ?? null, pc: null },
    { label: "PSA 8",   grade: 8,   ebay: pricing?.graded.find(g => g.grade === 8)?.median ?? null,   pc: null },
  ].filter(g => g.ebay != null || g.pc != null);

  const hasGradedData = gradedRows.length > 0;
  const hasPricingData = pricing != null;

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
        <TouchableOpacity onPress={toggleSave} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, isSaved && styles.savedBtnText]}>
            {isSaved ? "★ Saved" : "☆ Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Card Identity ────────────────────────────────────── */}
        <View style={[styles.identityCard, theme.shadow]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="contain" />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Pokeball size={48} />
            </View>
          )}
          <View style={styles.identityInfo}>
            <Text style={styles.cardName}>{card.name}</Text>
            <Text style={styles.cardSet}>{card.set}</Text>
            <Text style={styles.cardMeta}>
              #{card.number}{card.rarity ? `  ·  ${card.rarity}` : ""}
            </Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round(card.confidence * 100)}% match
              </Text>
            </View>
          </View>
        </View>

        {/* ── UNGRADED ─────────────────────────────────────────── */}
        <View style={[styles.pricingBlock, theme.shadow]}>
          <View style={styles.pricingBlockHeader}>
            <View style={[styles.sectionPill, { backgroundColor: "rgba(75,144,220,0.1)" }]}>
              <Text style={[styles.sectionPillText, { color: theme.blue }]}>UNGRADED</Text>
            </View>
            {hasPricingData && pricing.trend && (
              <View style={styles.trendBadge}>
                <Text style={[styles.trendText, { color: TREND_COLORS[pricing.trend] }]}>
                  {TREND_ICONS[pricing.trend]} {pricing.trend.charAt(0).toUpperCase() + pricing.trend.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {hasPricingData ? (
            <Text style={styles.mainPrice}>{fmt(pricing.median)}</Text>
          ) : (
            <SkeletonBox width="50%" height={44} />
          )}
          <Text style={styles.mainPriceSub}>Estimated market value</Text>

          {/* Per-source chips */}
          <View style={styles.sourceChipsRow}>
            <SourceChip
              label="TCGPlayer"
              price={pricing?.tcgplayer.market ?? null}
              accent={pricing?.tcgplayer.market != null}
              loading={!hasPricingData}
            />
            <SourceChip
              label="eBay Raw"
              price={pricing?.ebay.median ?? null}
              loading={!hasPricingData}
            />
            <SourceChip
              label="PriceCharting"
              price={pc?.loose ?? null}
              loading={!hasPricingData}
            />
          </View>

          {/* Low / High range bar */}
          {hasPricingData && (pricing.low != null || pricing.high != null) && (
            <View style={styles.rangeRow}>
              <Text style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>Low  </Text>
                <Text style={styles.rangeValue}>{fmt(pricing.low)}</Text>
              </Text>
              <View style={styles.rangeDot} />
              <Text style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>High  </Text>
                <Text style={styles.rangeValue}>{fmt(pricing.high)}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* ── GRADED ───────────────────────────────────────────── */}
        {(hasGradedData || !hasPricingData) && (
          <View style={[styles.pricingBlock, theme.shadow]}>
            <View style={styles.pricingBlockHeader}>
              <View style={[styles.sectionPill, { backgroundColor: "rgba(76,184,122,0.1)" }]}>
                <Text style={[styles.sectionPillText, { color: theme.green }]}>GRADED (PSA)</Text>
              </View>
            </View>

            {!hasPricingData ? (
              <View style={styles.gradedSkeletonRow}>
                {[0, 1, 2].map(i => (
                  <SkeletonBox key={i} width="30%" height={72} />
                ))}
              </View>
            ) : !hasGradedData ? (
              <Text style={styles.gradedEmptyText}>No graded sales data found</Text>
            ) : (
              <>
                {/* Top row: PSA 10 featured, plus PSA 9.5 & 9 */}
                <View style={styles.gradedTopRow}>
                  {gradedRows.slice(0, 3).map((g, i) => (
                    <GradeBubble
                      key={g.grade}
                      label={g.label}
                      ebayPrice={g.ebay}
                      pcPrice={g.pc}
                      featured={i === 0}
                    />
                  ))}
                </View>
                {/* Bottom row: PSA 8.5 & 8 if present */}
                {gradedRows.length > 3 && (
                  <View style={styles.gradedBottomRow}>
                    {gradedRows.slice(3).map(g => (
                      <GradeBubble
                        key={g.grade}
                        label={g.label}
                        ebayPrice={g.ebay}
                        pcPrice={g.pc}
                      />
                    ))}
                  </View>
                )}
                <Text style={styles.gradedDisclaimer}>
                  eBay sold listings · PriceCharting reference
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── No pricing fallback ───────────────────────────────── */}
        {hasPricingData &&
          pricing.median == null &&
          !hasGradedData && (
            <View style={[styles.noPriceCard, theme.shadowSm]}>
              <Image
                source={require("../../assets/icon1.png")}
                style={styles.noPriceIcon}
                resizeMode="contain"
              />
              <Text style={styles.noPriceText}>No pricing data found</Text>
              <Text style={styles.noPriceSub}>This card may be very new or very rare</Text>
            </View>
          )}

        {/* ── Recent eBay Sales ─────────────────────────────────── */}
        {sales.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Ungraded Sales · eBay</Text>
            {displaySales.map((sale, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.saleRow, theme.shadowSm]}
                onPress={() => sale.url && Linking.openURL(sale.url)}
                activeOpacity={0.7}
              >
                <View style={styles.saleLeft}>
                  <Text style={styles.saleTitle} numberOfLines={1}>{sale.title}</Text>
                  <Text style={styles.saleDate}>
                    {sale.soldDate ? new Date(sale.soldDate).toLocaleDateString() : ""}
                  </Text>
                </View>
                <Text style={styles.salePrice}>{fmt(sale.price)}</Text>
              </TouchableOpacity>
            ))}
            {sales.length > 5 && (
              <TouchableOpacity
                style={styles.showMoreBtn}
                onPress={() => setShowAllSales(v => !v)}
              >
                <Text style={styles.showMoreText}>
                  {showAllSales ? "Show less" : `Show all ${sales.length} sales`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Bottom actions ────────────────────────────────────── */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.saveActionBtn, theme.shadow, isSaved && styles.savedActionBtn]}
            onPress={toggleSave}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveActionText, isSaved && styles.savedActionText]}>
              {isSaved ? "★  Saved to Collection" : "☆  Save to Collection"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scanAgainBtn, theme.shadow]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.scanAgainText}>Scan Another</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 8, minWidth: 64 },
  backText: { color: theme.blue, fontSize: 17, fontWeight: "600" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerLogo: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  saveBtn: { padding: 8, minWidth: 64, alignItems: "flex-end" },
  saveBtnText: { color: theme.textSecondary, fontSize: 14, fontWeight: "600" },
  savedBtnText: { color: theme.green },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },

  // Card identity
  identityCard: {
    backgroundColor: theme.surface, borderRadius: 18, padding: 16,
    flexDirection: "row", gap: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  cardImage: { width: 88, height: 123, borderRadius: 8 },
  cardImagePlaceholder: {
    width: 88, height: 123, borderRadius: 8,
    backgroundColor: theme.bgAlt, alignItems: "center", justifyContent: "center",
  },
  identityInfo: { flex: 1, justifyContent: "center", gap: 5 },
  cardName: { fontSize: 20, fontWeight: "700", color: theme.textPrimary },
  cardSet: { fontSize: 13, color: theme.textSecondary },
  cardMeta: { fontSize: 12, color: theme.textMuted },
  confidenceBadge: {
    marginTop: 6, backgroundColor: "rgba(75,144,220,0.1)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start",
  },
  confidenceText: { color: theme.blue, fontSize: 12, fontWeight: "600" },

  // Shared pricing block
  pricingBlock: {
    backgroundColor: theme.surface, borderRadius: 18, padding: 18,
    gap: 14, borderWidth: 1, borderColor: theme.border,
  },
  pricingBlockHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionPill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  sectionPillText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  trendBadge: {},
  trendText: { fontSize: 13, fontWeight: "600" },

  // Ungraded main price
  mainPrice: {
    fontSize: 50, fontWeight: "800", color: theme.yellow,
    fontVariant: ["tabular-nums"], letterSpacing: -1,
  },
  mainPriceSub: { color: theme.textMuted, fontSize: 12, marginTop: -10 },

  // Source chips
  sourceChipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  sourceChip: {
    flex: 1, minWidth: 90, backgroundColor: theme.bgAlt, borderRadius: 12,
    padding: 10, gap: 3, borderWidth: 1, borderColor: theme.border,
  },
  sourceChipAccent: {
    backgroundColor: "rgba(75,144,220,0.06)", borderColor: "rgba(75,144,220,0.2)",
  },
  sourceChipLabel: { color: theme.textMuted, fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sourceChipLabelAccent: { color: theme.blue },
  sourceChipPrice: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, fontVariant: ["tabular-nums"] },
  sourceChipPriceAccent: { color: theme.blue },

  // Low / High range
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rangeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.border },
  rangeItem: {},
  rangeLabel: { color: theme.textMuted, fontSize: 12 },
  rangeValue: { color: theme.textSecondary, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },

  // Graded bubbles
  gradedTopRow: { flexDirection: "row", gap: 10 },
  gradedBottomRow: { flexDirection: "row", gap: 10 },
  gradedSkeletonRow: { flexDirection: "row", gap: 10 },
  gradedEmptyText: { color: theme.textMuted, fontSize: 13, textAlign: "center", paddingVertical: 8 },
  gradedDisclaimer: { color: theme.textMuted, fontSize: 10, textAlign: "right" },

  gradeBubble: {
    flex: 1, backgroundColor: theme.bgAlt, borderRadius: 14, padding: 12,
    alignItems: "center", gap: 3, borderWidth: 1, borderColor: theme.border,
  },
  gradeBubbleFeatured: {
    backgroundColor: "rgba(76,184,122,0.08)",
    borderColor: "rgba(76,184,122,0.3)",
  },
  gradeLabel: { color: theme.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  gradeLabelFeatured: { color: theme.green },
  gradePrice: { fontSize: 18, fontWeight: "800", color: theme.textPrimary, fontVariant: ["tabular-nums"] },
  gradePriceFeatured: { fontSize: 20, color: theme.green },
  gradePcRef: { fontSize: 10, color: theme.textMuted, fontVariant: ["tabular-nums"] },
  gradeSource: { fontSize: 9, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },

  // eBay sales
  section: { gap: 10 },
  sectionTitle: {
    color: theme.textMuted, fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1,
  },
  saleRow: {
    backgroundColor: theme.surface, borderRadius: 12, padding: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: theme.border,
  },
  saleLeft: { flex: 1, marginRight: 12, gap: 3 },
  saleTitle: { color: theme.textPrimary, fontSize: 13 },
  saleDate: { color: theme.textMuted, fontSize: 11 },
  salePrice: { fontSize: 15, fontWeight: "700", color: theme.textPrimary, fontVariant: ["tabular-nums"] },

  showMoreBtn: { alignItems: "center", paddingVertical: 8 },
  showMoreText: { color: theme.blue, fontSize: 13, fontWeight: "600" },

  // No price
  noPriceCard: {
    backgroundColor: theme.surface, borderRadius: 14, padding: 28,
    alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.border,
  },
  noPriceIcon: { width: 100, height: 100, marginBottom: 4 },
  noPriceText: { color: theme.textSecondary, fontSize: 15, fontWeight: "600" },
  noPriceSub: { color: theme.textMuted, fontSize: 13 },

  // Bottom actions
  bottomActions: { gap: 12, marginTop: 8 },
  saveActionBtn: {
    backgroundColor: theme.green, borderRadius: 16,
    paddingVertical: 16, alignItems: "center",
  },
  savedActionBtn: { backgroundColor: theme.bgAlt, borderWidth: 1.5, borderColor: theme.green },
  saveActionText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  savedActionText: { color: theme.green },
  scanAgainBtn: {
    backgroundColor: theme.yellow, borderRadius: 16,
    paddingVertical: 16, alignItems: "center",
  },
  scanAgainText: { color: theme.dark, fontWeight: "700", fontSize: 16 },

  skeleton: { backgroundColor: theme.border, borderRadius: 6 },
});
