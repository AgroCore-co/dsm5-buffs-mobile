import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import BuffsLogo from "../../../assets/images/logoBuffs.svg";

const AnimatedBuffsLogo = Animated.createAnimatedComponent(BuffsLogo);

export default function BuffaloLoader() {
  const flowAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(flowAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = flowAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        <AnimatedBuffsLogo width="100%" height="100%" />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.flow,
            { transform: [{ translateX }] },
          ]}
        >
          <LinearGradient
            colors={[
              "transparent",
              "rgba(255,255,255,0.35)",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: 180,
    height: 180,
    overflow: "hidden",
    opacity: 0.8,
  },
  flow: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "60%",
    height: "100%",
  },
});
