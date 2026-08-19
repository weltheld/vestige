import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Vestige Campaign",
};

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung" updated="Juni 2026">
      <p>
        Diese Erklärung informiert über die Verarbeitung personenbezogener Daten
        bei der Nutzung von Vestige Campaign. Vestige Campaign nutzt <strong>kein Tracking</strong>,
        keine Analyse-Werkzeuge und keine Werbung.
      </p>

      <LegalSection heading="1. Verantwortlicher">
        <p>
          Felix Hoge
          <br />
          14193 Berlin, Deutschland
          <br />
          E-Mail:{" "}
          <a
            href="mailto:felix.h.oge@googlemail.com"
            className="text-wine underline-offset-4 hover:underline"
          >
            felix.h.oge@googlemail.com
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="2. Aufruf der Website (Server-Logs)">
        <p>
          Beim Aufruf der Website verarbeitet unser Hosting-Dienstleister
          technisch notwendige Daten (u. a. IP-Adresse, Zeitpunkt der Anfrage,
          aufgerufene Seite, Browsertyp), um die Auslieferung und Sicherheit der
          Seite zu gewährleisten. Rechtsgrundlage ist unser berechtigtes
          Interesse an einem sicheren, funktionsfähigen Angebot (Art. 6 Abs. 1
          lit. f DSGVO).
        </p>
        <p>
          Hosting erfolgt durch die <strong>Vercel Inc.</strong> (USA). Dabei kann
          eine Übermittlung in die USA stattfinden; diese wird über die
          EU-Standardvertragsklauseln (Art. 46 DSGVO) abgesichert.
        </p>
      </LegalSection>

      <LegalSection heading="3. Registrierung & Anmeldung (Magic Link)">
        <p>
          Die An- und Abmeldung erfolgt passwortlos über einen per E-Mail
          versandten Anmeldelink. Hierzu verarbeiten wir Ihre{" "}
          <strong>E-Mail-Adresse</strong> sowie optional von Ihnen angegebene
          Angaben (Vorname, Charaktername). Zweck ist die Bereitstellung Ihres
          Kontos und die Authentifizierung. Rechtsgrundlage ist Art. 6 Abs. 1
          lit. b DSGVO (Nutzungsverhältnis).
        </p>
        <p>
          Konto- und Authentifizierungsdaten werden über{" "}
          <strong>Supabase</strong> verarbeitet; die Datenbank wird in der
          <strong> Europäischen Union (Irland, eu-west-1)</strong> gehostet. Der
          Versand der Anmelde-E-Mails erfolgt über einen
          E-Mail-Versanddienstleister (Resend), wobei eine Übermittlung in die USA
          stattfinden kann, abgesichert über EU-Standardvertragsklauseln.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cookies">
        <p>
          Es werden ausschließlich technisch notwendige Cookies gesetzt, die für
          die Anmeldung und das Aufrechterhalten Ihrer Sitzung erforderlich sind
          (Supabase-Auth). Es findet kein Tracking statt. Rechtsgrundlage für die
          Speicherung ist § 25 Abs. 2 Nr. 2 TDDDG; ein Einwilligungsbanner ist
          daher nicht erforderlich.
        </p>
      </LegalSection>

      <LegalSection heading="5. Empfänger / Auftragsverarbeiter">
        <p>
          Zur Bereitstellung des Dienstes setzen wir Auftragsverarbeiter nach
          Art. 28 DSGVO ein:
        </p>
        <ul className="ml-5 list-disc">
          <li>Supabase (Authentifizierung &amp; Datenbank, Hosting in der EU/Irland)</li>
          <li>Vercel Inc. (Website-Hosting, USA)</li>
          <li>Resend (Versand der Anmelde-E-Mails, USA)</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Speicherdauer">
        <p>
          Konto- und Profildaten werden gespeichert, solange Ihr Konto besteht.
          Auf Wunsch löschen wir Ihr Konto und die zugehörigen Daten. Server-Logs
          werden nur kurzfristig zu Sicherheitszwecken vorgehalten.
        </p>
      </LegalSection>

      <LegalSection heading="7. Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21 DSGVO). Zur
          Ausübung genügt eine Nachricht an die oben genannte E-Mail-Adresse.
        </p>
        <p>
          Ihnen steht zudem ein Beschwerderecht bei einer
          Datenschutz-Aufsichtsbehörde zu (Art. 77 DSGVO).
        </p>
      </LegalSection>

      <LegalSection heading="8. Verschlüsselung">
        <p>
          Die Website wird ausschließlich über eine verschlüsselte
          TLS/HTTPS-Verbindung ausgeliefert.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
