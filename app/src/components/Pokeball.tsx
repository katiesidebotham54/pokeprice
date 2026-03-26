import React from "react";
import { View, ViewStyle } from "react-native";

interface Props {
  size?: number;
  style?: ViewStyle;
}

/**
 * Minimalist Pokeball icon rendered with React Native Views.
 * Red top half, white bottom half, center stripe + circle button.
 */
export default function Pokeball({ size = 28, style }: Props) {
  const bw = Math.max(1.5, Math.round(size * 0.07));
  const inner = size - bw * 2; // content area side length
  const half = inner / 2;
  const cSize = size * 0.3;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: bw,
          borderColor: "#1E293B",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {/* Top red half */}
      <View style={{ height: half, backgroundColor: "#EF4444" }} />
      {/* Bottom white half */}
      <View style={{ height: half, backgroundColor: "#FFFFFF" }} />

      {/* Center stripe */}
      <View
        style={{
          position: "absolute",
          top: half - bw / 2,
          left: 0,
          right: 0,
          height: bw,
          backgroundColor: "#1E293B",
        }}
      />

      {/* Center button circle */}
      <View
        style={{
          position: "absolute",
          top: half - cSize / 2,
          left: half - cSize / 2,
          width: cSize,
          height: cSize,
          borderRadius: cSize / 2,
          backgroundColor: "#F8F8F8",
          borderWidth: bw,
          borderColor: "#1E293B",
        }}
      />
    </View>
  );
}
