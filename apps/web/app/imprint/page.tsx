import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Impressum — Vestige",
};

export default function ImprintPage() {
  return (
    <LegalLayout title="Impressum" updated="Juni 2026">
      <LegalSection heading="Angaben gemäß § 5 DDG">
        <p>
          Felix Hoge
          <br />
          14193 Berlin
          <br />
          Deutschland
        </p>
      </LegalSection>

      <LegalSection heading="Kontakt">
        <p>
          E-Mail:{" "}
          <a
            href="mailto:felix.h.oge@googlemail.com"
            className="text-wine underline-offset-4 hover:underline"
          >
            felix.h.oge@googlemail.com
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          Felix Hoge
          <br />
          14193 Berlin
        </p>
      </LegalSection>

      <LegalSection heading="Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte
          auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach
          §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
          Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon
          unberührt.
        </p>
      </LegalSection>

      <LegalSection heading="Verbraucherstreitbeilegung">
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an
          Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
