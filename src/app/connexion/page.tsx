import type { Metadata } from 'next';
import Link from 'next/link';
import { appConfig } from '@/core/config/app.config';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <main className="login-page">
      <Link href="/" className="brand-link" aria-label="Retour à l’accueil">{appConfig.shortName}</Link>
      <section className="card login-card" aria-labelledby="login-title">
        <span className="tag">Accès réservé</span>
        <h1 id="login-title">Connexion à votre espace</h1>
        <p>Identifiez-vous avec votre compte et votre application d’authentification.</p>
        <LoginForm />
      </section>
      <p className="muted">Pas de création de compte publique. Seul le propriétaire peut inviter des utilisateurs.</p>
    </main>
  );
}
