import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS } from 'react-native';

export default function TabLayout() {
  return (
    <NativeTabs iconColor={'red'} blurEffect='prominent' labelStyle={{
        // For the text color
        color: DynamicColorIOS({
          dark: 'white',
          light: 'black',
        }),
      }}
       tintColor={DynamicColorIOS({
        dark: 'white',
        light: 'black',
      })}
      minimizeBehavior='onScrollDown'>
      <NativeTabs.Trigger name="index">
        <Label>Phim</Label>
        <Icon sf="film.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites" role='favorites'>
        <Label>Yêu thích</Label>
        <Icon sf="heart.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role='search' >
        <Label>Tìm kiếm</Label>
        <Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>Cài đặt</Label>
        <Icon sf="gear" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
