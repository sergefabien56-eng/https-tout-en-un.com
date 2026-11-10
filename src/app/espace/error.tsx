'use client';

export default function PrivateError({ reset }: { reset: () => void }) {
  return <main role="alert">
    <h1>Votre espace est momentanément indisponible</h1>
    <p>Aucune donnée n’a été modifiée. Réessayez ou contactez l’administrateur.</p>
    <button type="button" onClick={reset}>Réessayer</button>
  </main>;
}
