import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Vestige Campaign",
};

const mailLink = (
  <a
    href="mailto:felix.h.oge@googlemail.com"
    className="text-wine underline-offset-4 hover:underline"
  >
    felix.h.oge@googlemail.com
  </a>
);

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung" updated="Oktober 2026">
      <p>
        Diese Erklärung informiert darüber, welche personenbezogenen Daten bei
        der Nutzung von Vestige Campaign verarbeitet werden, wofür und auf
        welcher Rechtsgrundlage. Vestige Campaign nutzt{" "}
        <strong>kein Tracking</strong>, keine Analyse-Werkzeuge und keine
        Werbung.
      </p>

      <LegalSection heading="1. Verantwortlicher">
        <p>
          Felix Hoge
          <br />
          14193 Berlin, Deutschland
          <br />
          E-Mail: {mailLink}
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
          EU-Standardvertragsklauseln (Art. 46 DSGVO) abgesichert. Schriftarten
          werden von unserem eigenen Server ausgeliefert; beim Aufruf wird keine
          Verbindung zu Schriftarten-Anbietern aufgebaut.
        </p>
      </LegalSection>

      <LegalSection heading="3. Registrierung & Anmeldung (Magic Link)">
        <p>
          Die An- und Abmeldung erfolgt passwortlos über einen per E-Mail
          versandten Anmeldelink. Hierzu verarbeiten wir Ihre{" "}
          <strong>E-Mail-Adresse</strong> sowie optional von Ihnen angegebene
          Angaben (Vorname, Anzeigename, Charaktername, Profilbild). Zweck ist
          die Bereitstellung Ihres Kontos und die Authentifizierung.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Nutzungsverhältnis).
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

      <LegalSection heading="4. Kampagnen und Inhalte">
        <p>
          Vestige Campaign dient der Organisation von Rollenspielgruppen. Je
          nach Nutzung verarbeiten wir folgende Inhalte, die Sie oder andere
          Mitglieder Ihrer Kampagne eingeben:
        </p>
        <ul className="ml-5 list-disc">
          <li>
            Kampagnen, Mitgliedschaften, Einladungen (einschließlich der
            E-Mail-Adresse eingeladener Personen) und Beitrittscodes
          </li>
          <li>Terminabstimmungen (Verfügbarkeiten) und festgelegte Spieltermine</li>
          <li>
            Journal-Einträge, Notizen, Kommentare, Reaktionen, Anmerkungen,
            Versionsverläufe sowie Codex-Einträge (z. B. Figuren, Orte)
          </li>
          <li>
            Charakterbögen, die Sie aus Foundry VTT übertragen, einschließlich
            der Zuordnung zu Spielern
          </li>
          <li>
            Hochgeladene Bilder (Profilbilder, Kampagnenbanner, Bilder zu
            Sitzungen und Charakteren)
          </li>
        </ul>
        <p>
          Zweck ist die Bereitstellung dieser Funktionen. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. b DSGVO (Nutzungsverhältnis) bzw. Art. 6 Abs. 1
          lit. f DSGVO, soweit Inhalte anderen Mitgliedern derselben Kampagne
          angezeigt werden. Die Inhalte einer Kampagne sind für die Mitglieder
          dieser Kampagne sichtbar. Bitte tragen Sie keine sensiblen Daten
          (Art. 9 DSGVO) ein und geben Sie Namen oder Bilder Dritter nur ein,
          wenn diese damit einverstanden sind.
        </p>
      </LegalSection>

      <LegalSection heading="5. Optionale KI-Funktionen">
        <p>
          Der Ersteller einer Kampagne kann optional KI-Funktionen nutzen
          (z. B. Zusammenfassungen und das Vorschlagen von Codex-Einträgen).
          Hierfür hinterlegt er einen eigenen API-Schlüssel von{" "}
          <strong>Anthropic</strong> oder <strong>Groq</strong>. Wird eine
          solche Funktion ausgelöst, werden die dafür nötigen Texte aus der
          Kampagne (z. B. Sitzungsberichte) an den gewählten Anbieter in den USA
          übermittelt. Ohne Auslösen der Funktion erfolgt keine Übermittlung.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO; die
          Übermittlung in die USA erfolgt auf Grundlage der
          Standardvertragsklauseln der jeweiligen Anbieter. Der hinterlegte
          API-Schlüssel wird in unserer Datenbank gespeichert und nur für diese
          Funktion verwendet.
        </p>
      </LegalSection>

      <LegalSection heading="6. Anbindung von Foundry VTT und Familiar">
        <p>
          Optional können Sie Vestige Campaign mit dem Foundry-VTT-Modul bzw. der
          Anwendung „Familiar“ verbinden. Die Verbindung erfolgt über einen
          persönlichen Zugangsschlüssel (Token), den Sie selbst eintragen. Dabei
          werden die von Ihnen gesendeten Daten übertragen und gespeichert, etwa
          Charakterbögen oder Sitzungszusammenfassungen und Statistiken zu
          Redeanteilen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Sie
          können die Verbindung jederzeit beenden und den Zugangsschlüssel
          zurücksetzen.
        </p>
      </LegalSection>

      <LegalSection heading="7. Cookies und lokaler Speicher">
        <p>
          Es werden ausschließlich technisch notwendige Cookies gesetzt, die für
          die Anmeldung und das Aufrechterhalten Ihrer Sitzung erforderlich sind
          (Supabase-Auth). Zusätzlich speichert Ihr Browser lokal (localStorage)
          Ihre gewählte Darstellung (Farbschema) sowie, vorübergehend während
          der Registrierung, einen eingegebenen Beitrittscode und ein
          ausgewähltes Profilbild. Es findet kein Tracking statt. Rechtsgrundlage
          für die Speicherung ist § 25 Abs. 2 Nr. 2 TDDDG; ein
          Einwilligungsbanner ist daher nicht erforderlich.
        </p>
      </LegalSection>

      <LegalSection heading="8. Empfänger / Auftragsverarbeiter">
        <p>
          Zur Bereitstellung des Dienstes setzen wir Auftragsverarbeiter nach
          Art. 28 DSGVO ein:
        </p>
        <ul className="ml-5 list-disc">
          <li>Supabase (Authentifizierung, Datenbank &amp; Dateispeicher, Hosting in der EU/Irland)</li>
          <li>Vercel Inc. (Website-Hosting, USA)</li>
          <li>Resend (Versand der Anmelde-E-Mails, USA)</li>
          <li>
            Anthropic bzw. Groq (USA) — nur, wenn der Kampagnenersteller eine
            KI-Funktion auslöst (siehe Abschnitt 5)
          </li>
        </ul>
        <p>Eine darüber hinausgehende Weitergabe Ihrer Daten erfolgt nicht.</p>
      </LegalSection>

      <LegalSection heading="9. Speicherdauer">
        <p>
          Konto- und Profildaten werden gespeichert, solange Ihr Konto besteht.
          Kampagneninhalte bleiben bestehen, solange die Kampagne existiert.
          Auf Wunsch löschen wir Ihr Konto und die zugehörigen Daten; Beiträge,
          die für den Fortbestand einer Kampagne erforderlich sind, können wir
          dabei anonymisieren. Server-Logs werden nur kurzfristig zu
          Sicherheitszwecken vorgehalten.
        </p>
      </LegalSection>

      <LegalSection heading="10. Pflicht zur Bereitstellung">
        <p>
          Die Angabe Ihrer E-Mail-Adresse ist für die Anmeldung erforderlich;
          ohne sie kann kein Konto angelegt werden. Alle weiteren Angaben sind
          freiwillig. Eine automatisierte Entscheidungsfindung einschließlich
          Profiling nach Art. 22 DSGVO findet nicht statt.
        </p>
      </LegalSection>

      <LegalSection heading="11. Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21 DSGVO).
          Soweit eine Verarbeitung auf einer Einwilligung beruht, können Sie
          diese jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3
          DSGVO). Zur Ausübung genügt eine Nachricht an {mailLink}.
        </p>
        <p>
          <strong>Widerspruchsrecht:</strong> Soweit wir Daten auf Grundlage
          unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO)
          verarbeiten, können Sie dieser Verarbeitung aus Gründen, die sich aus
          Ihrer besonderen Situation ergeben, jederzeit widersprechen.
        </p>
        <p>
          Ihnen steht zudem ein Beschwerderecht bei einer
          Datenschutz-Aufsichtsbehörde zu (Art. 77 DSGVO), z. B. bei der Berliner
          Beauftragten für Datenschutz und Informationsfreiheit.
        </p>
      </LegalSection>

      <LegalSection heading="12. Datensicherheit">
        <p>
          Die Website wird ausschließlich über eine verschlüsselte
          TLS/HTTPS-Verbindung ausgeliefert. Der Zugriff auf Kampagnendaten ist
          auf Mitglieder der jeweiligen Kampagne beschränkt.
        </p>
      </LegalSection>

      <LegalSection heading="13. Änderungen">
        <p>
          Wir passen diese Erklärung an, wenn sich der Dienst oder die
          rechtlichen Vorgaben ändern. Es gilt die jeweils hier veröffentlichte
          Fassung.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
