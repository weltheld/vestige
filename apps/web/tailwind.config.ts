import type { Config } from "tailwindcss";
import vestigePreset from "@vestige/config/tailwind-preset";

const config: Config = {
  presets: [vestigePreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // Pick up Tailwind classes used inside the shared UI package.
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
