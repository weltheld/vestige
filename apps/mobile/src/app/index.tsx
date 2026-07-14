import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/app/_layout";
import { supabase } from "@/lib/supabase";
import { fonts, themes } from "@/theme/vestige";

const t = themes.parchment;

/** M0 entry screen: 6-digit email OTP sign-in, then a signed-in stub that
 *  proves RLS reads work (campaign count). Real Home lands in M1. */
export default function Index() {
  const session = useSession();
  return session ? <SignedIn email={session.user.email ?? ""} /> : <SignIn />;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    // shouldCreateUser:false — accounts are created via web invites; the app
    // is a companion, not a signup surface.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setStage("code");
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) setError(error.message);
    // Success flips the session via onAuthStateChange in the root layout.
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.center}
      >
        <Text style={styles.wordmark}>VESTIGE</Text>
        <Text style={styles.tagline}>The chronicle awaits.</Text>

        {stage === "email" ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />
            <Pressable
              style={[styles.btn, busy && styles.btnDisabled]}
              onPress={sendCode}
              disabled={busy || !email.includes("@")}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnLabel}>Send sign-in code</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.hint}>
              We sent a 6-digit code to {email.trim()}
            </Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              placeholderTextColor={t.muted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              editable={!busy}
            />
            <Pressable
              style={[styles.btn, busy && styles.btnDisabled]}
              onPress={verify}
              disabled={busy || code.length !== 6}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnLabel}>Enter the chronicle</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setStage("email")} disabled={busy}>
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SignedIn({ email }: { email: string }) {
  const [count, setCount] = useState<number | null>(null);

  async function loadCampaigns() {
    const { count } = await supabase
      .from("campaign_members")
      .select("campaign_id", { count: "exact", head: true });
    setCount(count ?? 0);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.wordmark}>VESTIGE</Text>
        <Text style={styles.hint}>Signed in as {email}</Text>
        <Pressable style={styles.btn} onPress={loadCampaigns}>
          <Text style={styles.btnLabel}>Test RLS read</Text>
        </Pressable>
        {count !== null && (
          <Text style={styles.hint}>
            You are a member of {count} campaign{count === 1 ? "" : "s"}.
          </Text>
        )}
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.parchment },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: 6,
    color: t.ink,
  },
  tagline: {
    fontFamily: fonts.bodyItalic,
    fontSize: 15,
    color: t.inkSoft,
    marginBottom: 16,
  },
  form: { alignSelf: "stretch", gap: 12, maxWidth: 360, width: "100%" },
  input: {
    borderWidth: 1,
    borderColor: t.hairline,
    backgroundColor: t.surface,
    color: t.ink,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 10,
  },
  btn: {
    backgroundColor: t.wine,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnLabel: {
    color: "#ffffff",
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  hint: {
    fontFamily: fonts.body,
    color: t.inkSoft,
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    fontFamily: fonts.body,
    color: t.wine,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 8,
  },
  error: {
    fontFamily: fonts.body,
    color: t.voteNo,
    fontSize: 14,
    textAlign: "center",
  },
});
