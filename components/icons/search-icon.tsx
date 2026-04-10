import Svg, { Path } from 'react-native-svg';

type SearchIconProps = {
  size?: number;
  color?: string;
};

export function SearchIcon({ size = 35, color = '#D88769' }: SearchIconProps) {
  const viewBoxSize = 42;
  const scale = size / viewBoxSize;
  return (
    <Svg width={viewBoxSize * scale} height={viewBoxSize * scale} viewBox="0 0 42 42" fill="none">
      <Path
        d="M29.8594 29.8594L39.4219 39.4219"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17.9062 33.0469C26.2682 33.0469 33.0469 26.2682 33.0469 17.9062C33.0469 9.54431 26.2682 2.76562 17.9062 2.76562C9.54431 2.76562 2.76562 9.54431 2.76562 17.9062C2.76562 26.2682 9.54431 33.0469 17.9062 33.0469Z"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
