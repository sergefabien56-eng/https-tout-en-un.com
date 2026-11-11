/** Source unique de la navigation. « soon » est désactivé et n'a jamais de lien cliquable. */
import {
  LayoutDashboard, ShoppingCart, Store, Boxes, Wallet, ChartNoAxesCombined,
  Bot, Settings, House, Activity, Bell, Gauge, Package, Truck, ReceiptText,
  RotateCcw, Link2, RefreshCw, ClipboardList, Tags, Layers3, Warehouse,
  ArrowLeftRight, Landmark, FileText, PieChart, BarChart3, Sparkles,
  Workflow, Users, ShieldCheck, ScrollText, SlidersHorizontal, Search, Palette,
  type LucideIcon,
} from 'lucide-react';

export type NavLeaf = {
  id: string;
  label: string;
  href: `/${string}`;
  icon: LucideIcon;
  permission: string;
  availability: 'ready' | 'soon';
  scope?: 'global';
  badgeKey?: 'orders_pending' | 'stock_alerts' | 'sync_errors' | 'notifications';
};
export type NavGroup = { id: string; label: string; icon: LucideIcon; children: readonly NavLeaf[] };

const soon = (id: string, label: string, href: `/${string}`, icon: LucideIcon, permission: string): NavLeaf =>
  ({ id, label, href, icon, permission, availability: 'soon' });

export const navigation: readonly NavGroup[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, children: [
    { id: 'dashboard.overview', label: "Vue d'ensemble", href: '/espace', icon: House, permission: 'dashboard:read', availability: 'ready' },
    { id: 'dashboard.search', label: 'Recherche dans mon espace', href: '/espace/recherche', icon: Search, permission: 'dashboard:read', availability: 'ready' },
    { id: 'dashboard.appearance', label: 'Apparence', href: '/espace/apparence', icon: Palette, permission: 'dashboard:read', availability: 'ready' },
    soon('dashboard.finance', 'Indicateurs financiers', '/indicateurs', Gauge, 'finance:read'),
    soon('dashboard.performance', 'Performances globales', '/performances', ChartNoAxesCombined, 'reports:read'),
    soon('dashboard.activity', 'Activités récentes', '/activites', Activity, 'audit:read'),
    soon('dashboard.alerts', 'Alertes importantes', '/alertes', Bell, 'dashboard:read'),
  ] },
  { id: 'sales', label: 'Ventes & Commandes', icon: ShoppingCart, children: [
    soon('sales.orders', 'Toutes les commandes', '/commandes', ClipboardList, 'orders:read'),
    soon('sales.pending', 'À traiter', '/commandes/a-traiter', Package, 'orders:read'),
    soon('sales.shipped', 'Expédiées', '/commandes/expediees', Truck, 'orders:read'),
    soon('sales.returns', 'Retours', '/retours', RotateCcw, 'returns:read'),
    soon('sales.invoices', 'Factures originales', '/factures', ReceiptText, 'orders:read'),
    soon('sales.customers', 'Clients', '/clients', Users, 'orders:read:pii'),
    soon('sales.export', 'Exports', '/exports/commandes', FileText, 'reports:export'),
  ] },
  { id: 'shops', label: 'Boutiques & Plateformes', icon: Store, children: [
    { id: 'shops.all', label: 'Toutes les boutiques', href: '/espace/boutiques', icon: Store, permission: 'shops:read', availability: 'ready' },
    soon('shops.add', 'Ajouter une boutique', '/boutiques/ajouter', Link2, 'shops:connect'),
    soon('shops.connect', 'Connexions Jumia', '/connexions', Link2, 'shops:read'),
    soon('shops.sync', 'Synchronisations', '/synchronisations', RefreshCw, 'sync:read'),
    soon('shops.settings', 'Réglages boutiques', '/boutiques/reglages', SlidersHorizontal, 'shops:write'),
  ] },
  { id: 'catalog', label: 'Catalogue & Stocks', icon: Boxes, children: [
    soon('catalog.products', 'Produits', '/produits', Package, 'products:read'),
    soon('catalog.categories', 'Catégories', '/categories', Layers3, 'products:read'),
    soon('catalog.prices', 'Prix', '/prix', Tags, 'products:write'),
    soon('catalog.inventory', 'Stocks', '/stocks', Boxes, 'inventory:read'),
    soon('catalog.movements', 'Mouvements', '/mouvements', ArrowLeftRight, 'inventory:read'),
    soon('catalog.warehouses', 'Entrepôts', '/entrepots', Warehouse, 'inventory:read'),
    soon('catalog.counts', 'Inventaires', '/inventaires', ClipboardList, 'inventory:count'),
  ] },
  { id: 'finance', label: 'Finances & Comptabilité', icon: Wallet, children: [
    soon('finance.overview', 'Vue financière', '/finances', Wallet, 'finance:read'),
    soon('finance.payouts', 'Relevés Jumia', '/releves', Landmark, 'finance:read'),
    soon('finance.expenses', 'Dépenses', '/depenses', ReceiptText, 'finance:write'),
    soon('finance.purchase', 'Achats', '/achats', ShoppingCart, 'purchasing:read'),
    soon('finance.reconcile', 'Rapprochements', '/rapprochements', ArrowLeftRight, 'finance:reconcile'),
    soon('finance.exports', 'Exports financiers', '/exports/finances', FileText, 'reports:export'),
  ] },
  { id: 'reports', label: 'Analyses & Rapports', icon: ChartNoAxesCombined, children: [
    soon('reports.all', 'Tous les rapports', '/rapports', BarChart3, 'reports:read'),
    soon('reports.shops', 'Par boutique', '/rapports/boutiques', Store, 'reports:read'),
    soon('reports.products', 'Par produit', '/rapports/produits', Package, 'reports:read'),
    soon('reports.profit', 'Rentabilité', '/rapports/rentabilite', PieChart, 'finance:read'),
    soon('reports.downloads', 'Téléchargements', '/rapports/telechargements', FileText, 'reports:export'),
  ] },
  { id: 'automation', label: 'Automatisation & IA', icon: Bot, children: [
    soon('automation.mimi', 'Assistante MIMI', '/mimi', Sparkles, 'mimi:use'),
    soon('automation.rules', 'Règles', '/regles', Workflow, 'settings:manage'),
    soon('automation.jobs', 'Tâches planifiées', '/taches', Activity, 'system:manage'),
    { id: 'automation.notifications', label: 'Notifications', href: '/espace/notifications', icon: Bell, permission: 'dashboard:read', availability: 'ready' },
  ] },
  { id: 'admin', label: 'Administration', icon: Settings, children: [
    { id: 'admin.users', label: 'Utilisateurs', href: '/espace/utilisateurs', icon: Users, permission: 'users:read', availability: 'ready', scope: 'global' },
    { id: 'admin.roles', label: 'Rôles', href: '/espace/roles', icon: ShieldCheck, permission: 'roles:manage', availability: 'ready', scope: 'global' },
    { id: 'admin.audit', label: "Journal d'activité", href: '/espace/journal', icon: ScrollText, permission: 'audit:read', availability: 'ready' },
    soon('admin.settings', 'Paramètres', '/administration/parametres', SlidersHorizontal, 'settings:read'),
    { id: 'admin.system', label: 'Système', href: '/espace/systeme', icon: Activity, permission: 'system:manage', availability: 'ready', scope: 'global' },
  ] },
] as const;

export function visibleNavigation(permissions: ReadonlySet<string>, globalPermissions: ReadonlySet<string> = permissions): NavGroup[] {
  return navigation.map((group) => ({ ...group,
    children: group.children.filter((leaf) => permissions.has(leaf.permission) &&
      (leaf.scope !== 'global' || globalPermissions.has(leaf.permission))),
  })).filter((group) => group.children.length > 0);
}
