// Journal was its own Multi-Zones app (basePath "/journal") until it was
// folded into this app; fonts/tokens/theme now come from the root layout.
// This layer only carries Journal's extra stylesheet.
import "react-day-picker/style.css";

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
