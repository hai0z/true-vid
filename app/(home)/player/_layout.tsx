// app/(home)/category/_layout.tsx
import { Stack } from 'expo-router';

export default function Layout() {

    return (
        <Stack
         screenOptions={{
            gestureEnabled:false,
            headerShown:false,
            contentStyle
            :{ backgroundColor: '#000' }
         }}
        />
    );
}