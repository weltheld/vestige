import { Cinzel_400Regular, Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_700Bold,
} from "@expo-google-fonts/lora";
import type { Session } from "@supabase/supabase-js";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { themes } from "@/theme/vestige";

SplashScreen.preventAutoHideAsync();

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

// M0: theme fixed to parchment; the Profile screen's picker comes later.
const theme = themes.parchment;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cinzel_400Regular,
    Cinzel_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_700Bold,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (fontsLoaded && sessionLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, sessionLoaded]);

  if (!fontsLoaded || !sessionLoaded) return null;

  return (
    <SessionContext.Provider value={session}>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.parchment },
        }}
      />
    </SessionContext.Provider>
  );
}
