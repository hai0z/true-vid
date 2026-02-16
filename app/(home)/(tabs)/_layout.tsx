import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs backBehavior='initialRoute' blurEffect='none' iconColor={'red'} minimizeBehavior='onScrollDown'>
      <NativeTabs.Trigger name="index">
        <Label>Phim</Label>
        <Icon sf="film.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites" >
        <Label>Yêu thích</Label>
        <Icon sf="heart.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="actors">
        <Label>Diễn viên</Label>
        <Icon sf="person.2.fill" />
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
