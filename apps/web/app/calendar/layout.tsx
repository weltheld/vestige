// Calendar was its own Multi-Zones app (basePath "/calendar") until it was
// folded into this app; fonts/tokens/theme now come from the root layout.
// This layer only carries Calendar's extra stylesheet (scene backdrops,
// textures, month-slide animations).
import "./calendar.css";

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
