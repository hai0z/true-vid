import { View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  // const backgroundColor = useThemeColor({ light: darkColor, dark: darkColor }, 'background');

  return <View style={[{
    backgroundColor: Colors.dark.background
  }, style]} {...otherProps} />;
}
