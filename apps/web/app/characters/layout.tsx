/**
 * The Characters module's outermost layout — chrome-free on purpose.
 *
 * It exists only to carry the @modal parallel slot, so that a `<Link>` to
 * /characters/library from anywhere in the module (the header menu on a
 * campaign's sheet page) can be intercepted and rendered as an overlay above
 * the sheet instead of navigating away from it. The header and footer stay
 * where they were, in the campaign layout below this one.
 */
export default function CharactersLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
