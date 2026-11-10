-- 0001 — fonctions et extensions
-- Les extensions sont OPTIONNELLES : leur absence ne doit jamais faire échouer une migration
-- (PGlite / CI sans contrib). Les index qui en dépendent sont créés en 0006.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm indisponible (%): recherche floue désactivée', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS unaccent;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'unaccent indisponible (%): recherche accentuée non normalisée', SQLERRM;
END $$;

-- Horodatage automatique de mise à jour
CREATE OR REPLACE FUNCTION core_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Immuabilité du journal d'audit (ajout seul) — utilisée en 0004
CREATE OR REPLACE FUNCTION core_forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'MUTATION_INTERDITE: la table % est en ajout seul', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END $$;
