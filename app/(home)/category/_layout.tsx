// app/(home)/category/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';

export default function Layout() {
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';

    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTransparent: true,
                headerBlurEffect: isDark ? 'dark' : 'light',
                headerStyle: {
                    backgroundColor: 'transparent',
                },
                headerTintColor: isDark ? '#fff' : '#000',
                headerBackground: () => (
                    <BlurView
                        intensity={80}
                        tint={isDark ? 'dark' : 'light'}
                        style={{
                            flex: 1,
                            borderBottomWidth: 0.5,
                            borderBottomColor: isDark
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,0,0,0.1)',
                        }}
                    />
                ),
                headerLeft: () => (
                    <Pressable
                        onPress={() => router.back()}
                        hitSlop={12}
                        style={({ pressed }) => ({
                            opacity: pressed ? 0.5 : 1,
                            width: 36,
                            height: 36,
                            justifyContent: 'center',
                            alignItems: 'center',
                        })}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={24}
                            color={isDark ? '#fff' : '#000'}
                        />
                    </Pressable>
                ),
            }}
        />
    );
}