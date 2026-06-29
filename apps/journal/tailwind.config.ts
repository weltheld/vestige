import type { Config } from "tailwindcss";
import vestigePreset from "@vestige/config/tailwind-preset";

const config: Config = {
  presets: [vestigePreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
