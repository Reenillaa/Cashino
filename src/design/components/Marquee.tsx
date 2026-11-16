import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useTheme } from '../theme';

/**
 * Casino marquee sign: gold frame and a ring of bulbs that light up in a chasing pattern (like the
 * entrance of a real casino). Light-weight: one JS tick every 260 ms, paused when the screen is hidden.
 */
export function Marquee({ children, colors = ['#3A0D3E', '#1A0624'] }: { children: React.ReactNode; colors?: [string, string] }) {
  const { reduceMotion } = useTheme();
  const focused = useIsFocused();
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Bulb positions along the inner edge of the frame.
  const bulbs: { x: number; y: number }[] = [];
  if (box.w > 0) {
    const gap = 22, m = 9;
    const nx = Math.max(2, Math.floor((box.w - m * 2) / gap)), ny = Math.max(1, Math.floor((box.h - m * 2) / gap));
    for (let i = 0; i <= nx; i++) bulbs.push({ x: m + ((box.w - m * 2) * i) / nx, y: m });
    for (let j = 1; j <= ny; j++) bulbs.push({ x: box.w - m, y: m + ((box.h - m * 2) * j) / ny });
    for (let i = nx - 1; i >= 0; i--) bulbs.push({ x: m + ((box.w - m * 2) * i) / nx, y: box.h - m });
    for (let j = ny - 1; j >= 1; j--) bulbs.push({ x: m, y: m + ((box.h - m * 2) * j) / ny });
  }
  return (
    <View style={styles.frame} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <LinearGradient colors={['#FFE58A', '#C98B12', '#FFE58A', '#7A4E08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
      <View style={styles.inner}>
        <LinearGradient colors={colors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,214,120,0.18)', 'rgba(255,214,120,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </View>
      <Bulbs bulbs={bulbs} running={!reduceMotion && focused} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** The chasing lights. Only this small part re-renders on each tick, and lit bulbs change colour only
 * (animating glow shadows on ~40 bulbs was costly to repaint on phones). */
const Bulbs = React.memo(function Bulbs({ bulbs, running }: { bulbs: { x: number; y: number }[]; running: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % 3), 300);
    return () => clearInterval(id);
  }, [running]);
  return (
    <>
      {bulbs.map((b, i) => {
        const on = (i + phase) % 3 === 0;
        return <View key={i} pointerEvents="none" style={[styles.bulb, { left: b.x - 4, top: b.y - 4, backgroundColor: on ? '#FFF6C8' : '#8A6A2A', borderColor: on ? '#FFE58A' : '#6A4E1A' }]} />;
      })}
    </>
  );
}, (a, b) => a.running === b.running && a.bulbs.length === b.bulbs.length && a.bulbs[0]?.x === b.bulbs[0]?.x && a.bulbs[a.bulbs.length - 1]?.y === b.bulbs[b.bulbs.length - 1]?.y);

const styles = StyleSheet.create({
  frame: { borderRadius: 26, padding: 5, shadowColor: '#FFB938', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 6 } },
  inner: { position: 'absolute', left: 5, top: 5, right: 5, bottom: 5, borderRadius: 21, overflow: 'hidden' },
  bulb: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  content: { paddingHorizontal: 22, paddingVertical: 20 },
});
