import React from "react";
import Svg, { Path } from "react-native-svg";

type Props = {
  width?: number;
  height?: number;
  color?: string;
};

export default function ArrowLeftIcon({
  width = 3,
  height = 4,
  color = "#000",
}: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 3 4"
      fill="none"
    >
      <Path
        d="M2.05754 2.93776L0.785808 1.66602L2.05754 0.391516L1.66602 0L0 1.66602L1.66602 3.33205L2.05754 2.93776Z"
        fill={color}
      />
    </Svg>
  );
}
