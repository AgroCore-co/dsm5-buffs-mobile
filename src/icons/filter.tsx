import * as React from "react";

import Svg, {
  Path,
} from "react-native-svg";

interface FilterIconProps {
  width?: number;
  height?: number;
  fill?: string;
}

const FilterIcon: React.FC<
  FilterIconProps
> = ({
  width = 5,
  height = 5,
  fill = "#000",
}) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 5 5"
    fill="none"
  >
    <Path
      d="M3.05474 4.68708C3.06585 4.77038 3.03808 4.85924 2.97422 4.91755C2.86593 5.02584 2.691 5.02584 2.5827 4.91755L1.46924 3.80409C1.40538 3.74022 1.37761 3.65415 1.38872 3.57362V2.15195L0.0586781 0.449826C-0.03573 0.330428 -0.0135163 0.155496 0.105882 0.0610876C0.15864 0.0222137 0.21695 0 0.278038 0H4.16543C4.22651 0 4.28483 0.0222137 4.33758 0.0610876C4.45698 0.155496 4.4792 0.330428 4.38479 0.449826L3.05474 2.15195V4.68708ZM0.844486 0.555341L1.94406 1.96035V3.4931L2.4994 4.04844V1.95758L3.59898 0.555341H0.844486Z"
      fill={fill}
    />
  </Svg>
);

export default FilterIcon;