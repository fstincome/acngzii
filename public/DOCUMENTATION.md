# American Corner — Documentation Technique Complète

## 🏢 Vue d'ensemble

**American Corner** — *American Corner Visitor Management System*
Système de gestion des visiteurs pour le centre numérique American Corner au Burundi. Application web progressive (SPA) déployée sur cPanel.

---

## 🛠 Stack Technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router v6 |
| State / Data | TanStack React Query |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth (email/password) |
| Base de données | PostgreSQL (via Supabase) |
| Fonctions serveur | Supabase Edge Functions (Deno) |
| QR Code | html5-qrcode (scan) + qrcode.react (génération) |
| PDF | jspdf |
| Charts | Recharts |

---

## 📁 Structure du Codebase

```
src/
├── App.tsx                    # Routes + providers (QueryClient, Auth, Toaster)
├── index.css                  # Design tokens CSS (HSL, thème clair/sombre)
├── components/
│   ├── AppLayout.tsx          # Layout principal : sidebar responsive + navigation par rôle
│   ├── ProtectedRoute.tsx     # Guard d'authentification + contrôle de rôle
│   ├── MembershipCard.tsx     # Carte de membre avec QR code (pour programmes)
│   ├── NavLink.tsx            # Lien de navigation actif
│   └── ui/                    # Composants shadcn/ui (button, dialog, table, card, etc.)
├── hooks/
│   ├── useAuth.tsx            # Context Auth : session, user, role, signIn, signOut
│   └── use-toast.ts           # Système de notifications toast
├── lib/
│   ├── supabase-store.ts      # CRUD visiteurs/visites, occupancy, realtime
│   ├── program-store.ts       # CRUD programmes/participants/sessions/attendance
│   ├── duplicate-check.ts     # Détection de doublons par similarité de nom
│   ├── membership-card.ts     # Utilitaires carte de membre
│   └── utils.ts               # cn() pour classes Tailwind
├── pages/
│   ├── Login.tsx              # Connexion email/password
│   ├── Dashboard.tsx          # Tableau de bord temps réel + bouton backup admin
│   ├── RegisterVisitor.tsx    # Inscription visiteur (redirection depuis RegistrationForm)
│   ├── RegistrationForm.tsx   # Formulaire d'inscription complet
│   ├── Visitors.tsx           # Liste des visiteurs inscrits
│   ├── Scanner.tsx            # Scan QR pour entrées/sorties par salle
│   ├── Programs.tsx           # Gestion programmes + détail (participants/sessions)
│   ├── ProgramAttendance.tsx  # Pointage de présence par scan QR
│   ├── ProgramReport.tsx      # Rapport d'assiduité par programme
│   ├── DigitalCard.tsx        # Carte numérique visiteur
│   ├── Statistics.tsx         # Statistiques de fréquentation
│   ├── UserManagement.tsx     # Gestion des comptes utilisateurs (admin)
│   └── NotFound.tsx           # Page 404

supabase/
├── config.toml                # Config Supabase (auto-géré)
└── functions/
    ├── create-user/           # Création de compte utilisateur
    ├── delete-user/           # Suppression de compte
    ├── update-user-role/      # Modification rôle/nom
    ├── reset-password/        # Réinitialisation mot de passe
    ├── auto-checkout/         # Sortie automatique (cron 5min)
    ├── mark-absent-cron/      # Marquage absent (cron 20h00)
    └── backup-database/       # Export JSON complet (admin)

public/
├── .htaccess                  # Réécriture Apache pour SPA sur cPanel
├── manifest.json              # PWA manifest
└── logo-gss.png               # Logo
```

---

## 🗄 Structure Base de Données

### Tables principales

| Table | Description | Clé primaire |
|---|---|---|
| `visitors` | Tous les visiteurs/membres inscrits | `id` (uuid), `visitor_id` (text, unique) |
| `visits` | Historique entrées/sorties par salle | `id`, FK → `visitors.visitor_id` |
| `programs` | Programmes (nom, dates, logo) | `id` |
| `sub_programs` | Sous-programmes/filières | `id`, FK → `programs.id` |
| `program_participants` | Participants liés à un programme | `id`, FK → `programs.id` |
| `program_sessions` | Sessions/dates de cours | `id`, FK → `programs.id` |
| `program_attendance` | Présence par session | `id`, FK → `program_participants.id`, `program_sessions.id` |
| `profiles` | Profils des utilisateurs système | `id` (= auth.users.id) |
| `user_roles` | Rôles RBAC | `id`, `user_id`, `role` (enum) |

### Enum `app_role`

```
admin | director | reception
```

### Fonctions SQL

- **`get_user_role(uuid)`** → retourne le rôle texte d'un utilisateur
- **`has_role(uuid, app_role)`** → vérifie si un utilisateur possède un rôle (SECURITY DEFINER, évite la récursion RLS)
- **`handle_new_user()`** → trigger sur `auth.users` : crée automatiquement le profil dans `profiles`

### Realtime

- Table `visits` ajoutée à la publication `supabase_realtime` pour la synchronisation temps réel du dashboard

---

## 🔐 Système de Rôles & Permissions

| Fonctionnalité | Admin | Directeur | Réception |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Inscription visiteurs | ✅ | ✅ | ✅ |
| Scanner entrées/sorties | ✅ | ✅ | ✅ |
| Liste visiteurs | ✅ | ✅ | ✅ (lecture) |
| Créer/modifier programmes | ✅ | ✅ | ❌ |
| Supprimer programmes/visiteurs | ✅ | ❌ | ❌ |
| Gestion utilisateurs | ✅ | ❌ | ❌ |
| Backup base de données | ✅ | ❌ | ❌ |
| Rapports | ✅ | ✅ | ✅ (lecture) |

### RLS (Row-Level Security)

- **profiles** : lecture propre profil + admin lit tout
- **user_roles** : lecture propre rôle + admin gère tout
- **visitors, visits, programs, etc.** : accès public en lecture/écriture (sécurisé par l'auth côté app)

---

## ⚙️ Fonctionnalités Implémentées

### 1. Inscription Visiteur

- Formulaire complet : nom, téléphone, email, genre, quartier, profession, institution, date de naissance, photo
- **Détection de doublons** par similarité de nom (Levenshtein) → pré-remplissage si profil existant trouvé
- Génération automatique d'un `visitor_id` alphanumérique unique
- Génération de carte QR numérique

### 2. Gestion des Salles (Scanner)

- **3 zones** : Salle Informatique (capacité 20), Salle Polyvalente, Jardin
- Scan QR → check-in / check-out
- **Salle Informatique** : durée masquée, sortie manuelle ou automatique à 9h
- **Salle Polyvalente & Jardin** : sélecteur de durée ajustable, sortie manuelle disponible
- Validation : détection double scan, sortie sans entrée
- **Auto-checkout** : Edge Function `auto-checkout` exécutée toutes les 5 minutes via cron

### 3. Dashboard Temps Réel

- Occupation par salle avec compteurs live (Supabase Realtime)
- Alerte capacité pleine (Salle Informatique)
- Compte à rebours coloré (rouge/orange/jaune selon urgence)
- Graphique horaire des visites (Recharts)
- Liste des visiteurs du jour avec statut
- **Bouton Backup** (admin uniquement) → télécharge toute la BDD en JSON

### 4. Programmes

- CRUD complet : nom, description, dates, logo
- **Sous-programmes** (filières) rattachés à un programme
- **Participants** : ajout par recherche dans la base visiteurs existante
  - Si trouvé → sélection + choix du rôle (Élève/Mentor)
  - Si non trouvé → message + redirection vers le formulaire d'inscription
- **Sessions** : dates de cours
- **Carte de membre** : QR code unique par participant

### 5. Présence aux Programmes

- Pointage par scan QR sur la page ProgramAttendance
- Statuts : `present`, `en_attente`, `absent`
- **Cron job 20h00** (fuseau Bujumbura) : marque automatiquement `en_attente` → `absent`

### 6. Rapports

- Rapport d'assiduité par programme et session
- Taux de présence global calculé
- Interface mobile optimisée

### 7. Gestion Utilisateurs (Admin)

- Création de comptes avec rôle (via Edge Function `create-user`)
- Modification nom/rôle (via `update-user-role`)
- Réinitialisation mot de passe avec génération aléatoire (via `reset-password`)
- Suppression de comptes (via `delete-user`)
- Affichage des coordonnées générées avec copie presse-papier

### 8. Statistiques

- Fréquentation par salle et par période
- Visualisations graphiques

---

## 🔧 Edge Functions

| Fonction | Déclencheur | Rôle |
|---|---|---|
| `create-user` | Manuel (admin) | Crée un utilisateur auth + profil + rôle |
| `delete-user` | Manuel (admin) | Supprime un utilisateur auth |
| `update-user-role` | Manuel (admin) | Met à jour nom + rôle |
| `reset-password` | Manuel (admin) | Change le mot de passe |
| `auto-checkout` | Cron (*/5 * * * *) | Checkout auto si `expected_checkout` dépassé |
| `mark-absent-cron` | Cron (20h00 Bujumbura) | Marque `en_attente` → `absent` |
| `backup-database` | Manuel (admin) | Exporte toutes les tables en JSON |

Toutes les Edge Functions vérifient le rôle admin via `has_role()` sauf les cron jobs qui utilisent le service role key.

---

## 🎨 Design & Style

- **Thème** : Design tokens HSL dans `index.css` (clair/sombre)
- **Composants** : shadcn/ui personnalisés (Button, Dialog, Table, Card, Badge, etc.)
- **Responsive** : Sidebar collapsible, layout adaptatif mobile/desktop
- **Animations** : `animate-fade-in` sur les transitions de page
- **Navigation** : Sidebar avec sections collapsibles par catégorie (Normal, Programmes, Admin)
- **Icônes** : Lucide React

---

## 🚀 Déploiement

- **Build** : `vite build` → dossier `dist/`
- **Hébergement** : cPanel (Apache)
- **`.htaccess`** : Réécriture de toutes les routes vers `index.html` pour le routing SPA
- **PWA** : `manifest.json` configuré

---

*Document généré le 18 mars 2026 — American Corner v1.0*
