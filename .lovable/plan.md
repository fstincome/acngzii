## Objectif
Ajouter un menu **Access Control** (Admin/National Coordinator uniquement) pour gérer les permissions CRUD par rôle ET par utilisateur, sur 4 modules : Visitors, Programs, Statistics, Scanner.

## Modèle de permissions

5 actions par module : `view`, `create`, `update`, `delete`, `full` (= raccourci CRUD complet).

Modules contrôlés :
- `visitors` (register, list, edit, delete)
- `programs` (programmes, attendance, reports)
- `statistics` (page Statistics)
- `scanner` (QR scan)

Hiérarchie de résolution (du plus prioritaire au moins) :
1. Admin / National Coordinator → **toujours full access** (non éditable)
2. Override utilisateur (table `user_permissions`)
3. Défaut du rôle (table `role_permissions`)
4. Aucun accès

## Base de données

**Nouvelle table `role_permissions`** : `role`, `module`, `can_view`, `can_create`, `can_update`, `can_delete` (unique sur role+module).

**Nouvelle table `user_permissions`** : `user_id`, `module`, `can_view`, `can_create`, `can_update`, `can_delete` (unique sur user_id+module). NULL = pas d'override → utilise la valeur du rôle.

**Fonction SECURITY DEFINER `has_permission(_user_id, _module, _action)`** : retourne `true` si admin-like, sinon vérifie override user puis défaut role.

RLS : seuls admin/national_coordinator peuvent lire/écrire ces tables. Tous les users authentifiés peuvent lire **leurs propres** permissions (pour l'UI).

Seed : défauts raisonnables (Director = full sur visitors/programs/statistics/scanner ; Reception = view+create visitors, view+create scanner, view programs, pas de statistics).

## Frontend

**Nouvelle page `/access-control`** (admin-like only) accessible depuis le groupe "Administration" du sidebar :
- Onglet **Par rôle** : tableau Rôle × Module, chaque cellule = checkboxes (View / Create / Update / Delete) + bouton "Full CRUD" qui coche les 4. Admin et National Coordinator affichés en lecture seule avec badge "Full access (system)".
- Onglet **Par utilisateur** : liste des users avec recherche. Sélectionner un user → tableau Modules avec checkboxes + bouton "Use role default" (efface l'override).

**Hook `usePermissions()`** : charge les permissions effectives de l'utilisateur courant une fois, fournit `can(module, action)` synchrone.

**Application UI (mode "afficher désactivé")** :
- Boutons d'action (Register, Edit, Delete, etc.) → `disabled` + tooltip "Access denied" quand `!can(...)`.
- Liens sidebar restent visibles, mais cliquer mène à la page (le contenu sensible affiche bandeau "Read only" si seulement view).
- `ProtectedRoute` continue de protéger l'accès aux pages entières via `allowedRoles` ; les permissions CRUD affinent à l'intérieur.

## Fichiers techniques

- Migration : tables `role_permissions`, `user_permissions`, fonction `has_permission`, RLS, seed des défauts.
- `src/hooks/usePermissions.tsx` : hook + Provider.
- `src/pages/AccessControl.tsx` : nouvelle page avec les 2 onglets.
- `src/App.tsx` : route `/access-control` (allowedRoles admin/national_coordinator).
- `src/components/AppLayout.tsx` : entrée "Access Control" dans le groupe Administration.
- `src/i18n/locales/en.json` : clés `nav.accessControl`, `accessControl.*`.
- Intégration dans `Visitors.tsx`, `RegisterVisitor.tsx`, `Programs.tsx`, `ProgramAttendance.tsx`, `Statistics.tsx`, `Scanner.tsx` → disable boutons selon `can(...)`.

## Hors scope
- Restaurant (module désactivé actuellement).
- Permissions au niveau ligne (toujours via RLS existant).
- Audit log des changements de permissions.
