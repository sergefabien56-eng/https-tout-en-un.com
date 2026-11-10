-- 0006 — catalogue de permissions et affectation aux rôles système
-- Une permission = module:action. Une entrée de navigation sans permission n'est pas affichée.

INSERT INTO permissions (code, module, action, label) VALUES
  ('dashboard:read',        'dashboard',    'read',   'Consulter le tableau de bord'),
  ('shops:read',            'shops',        'read',   'Consulter les boutiques'),
  ('shops:write',           'shops',        'write',  'Ajouter et modifier une boutique'),
  ('shops:connect',         'shops',        'connect','Connecter une boutique à Jumia'),
  ('products:read',         'products',     'read',   'Consulter le catalogue'),
  ('products:write',        'products',     'write',  'Créer et modifier un produit'),
  ('orders:read',           'orders',       'read',   'Consulter les commandes'),
  ('orders:read:pii',       'orders',       'read_pii','Voir les données personnelles des clients'),
  ('orders:write',          'orders',       'write',  'Traiter une commande'),
  ('inventory:read',        'inventory',    'read',   'Consulter les stocks'),
  ('inventory:write',       'inventory',    'write',  'Enregistrer un mouvement de stock'),
  ('inventory:count',       'inventory',    'count',  'Réaliser un inventaire'),
  ('finance:read',          'finance',      'read',   'Consulter les finances'),
  ('finance:write',         'finance',      'write',  'Saisir une dépense ou un coût'),
  ('finance:reconcile',     'finance',      'reconcile','Rapprocher les paiements'),
  ('purchasing:read',       'purchasing',   'read',   'Consulter les achats et fournisseurs'),
  ('purchasing:write',      'purchasing',   'write',  'Créer une commande fournisseur'),
  ('returns:read',          'returns',      'read',   'Consulter les retours'),
  ('returns:write',         'returns',      'write',  'Traiter un retour'),
  ('reports:read',          'reports',      'read',   'Consulter les rapports'),
  ('reports:export',        'reports',      'export', 'Exporter des données'),
  ('sync:read',             'sync',         'read',   'Consulter l’état des synchronisations'),
  ('sync:run',              'sync',         'run',    'Lancer une synchronisation'),
  ('mimi:use',              'mimi',         'use',    'Utiliser MIMI'),
  ('users:read',            'users',        'read',   'Consulter les utilisateurs'),
  ('users:write',           'users',        'write',  'Créer et modifier un utilisateur'),
  ('roles:manage',          'users',        'manage_roles','Gérer les rôles et permissions'),
  ('audit:read',            'audit',        'read',   'Consulter le journal d’activité'),
  ('settings:read',         'settings',     'read',   'Consulter les paramètres'),
  ('settings:manage',       'settings',     'manage', 'Modifier les paramètres'),
  ('system:manage',         'system',       'manage', 'Accéder à l’écran Système');

-- Propriétaire : tout
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'owner', code FROM permissions;

-- Gestionnaire : tout sauf système et gestion des rôles
INSERT INTO role_permissions (role_code, permission_code)
SELECT 'manager', code FROM permissions
WHERE code NOT IN ('system:manage', 'roles:manage');

-- Responsable des stocks
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('stock_manager','dashboard:read'), ('stock_manager','shops:read'),
  ('stock_manager','products:read'),  ('stock_manager','products:write'),
  ('stock_manager','inventory:read'), ('stock_manager','inventory:write'),
  ('stock_manager','inventory:count'),('stock_manager','orders:read'),
  ('stock_manager','returns:read'),   ('stock_manager','returns:write'),
  ('stock_manager','purchasing:read'),('stock_manager','purchasing:write'),
  ('stock_manager','reports:read'),   ('stock_manager','sync:read');

-- Comptable
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('accountant','dashboard:read'),   ('accountant','shops:read'),
  ('accountant','orders:read'),      ('accountant','finance:read'),
  ('accountant','finance:write'),    ('accountant','finance:reconcile'),
  ('accountant','purchasing:read'),  ('accountant','returns:read'),
  ('accountant','reports:read'),     ('accountant','reports:export'),
  ('accountant','audit:read'),       ('accountant','sync:read');

-- Assistant : consultation et saisie de premier niveau
INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('assistant','dashboard:read'),  ('assistant','shops:read'),
  ('assistant','products:read'),   ('assistant','orders:read'),
  ('assistant','orders:write'),    ('assistant','inventory:read'),
  ('assistant','returns:read'),    ('assistant','reports:read'),
  ('assistant','sync:read');
