/** Squelette sans valeur financière factice. */
export default function Loading() {
  return <main aria-busy="true" aria-label="Chargement de l’espace privé">
    <div className="loading-line" /><div className="loading-line loading-short" />
    <p>Chargement de votre espace…</p>
  </main>;
}
