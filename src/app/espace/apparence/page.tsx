import { AppearancePreference } from '@/ui/appearance-preference';

/** Le layout privé impose la session ; cette préférence reste locale au navigateur. */
export default function AppearancePage() {
  return <main className="workspace-main">
    <span className="tag">Préférences personnelles</span>
    <h1>Apparence</h1>
    <p>Choisissez le thème de ce navigateur. Ce réglage n’est pas partagé avec vos autres appareils
      et ne modifie aucune donnée métier.</p>
    <AppearancePreference />
  </main>;
}
