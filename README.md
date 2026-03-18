# 🏢 GSS Access

**Gitega Study Space — Visitor Management System**

Système moderne de gestion des visiteurs pour le centre numérique [Gitega Study Space](https://gssaccess.lovable.app) au Burundi. Suivi en temps réel de la fréquentation, gestion des programmes éducatifs et pointage par QR code.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase)

---

## 📋 Sommaire

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Installation locale](#-installation-locale)
- [Structure du projet](#-structure-du-projet)
- [Base de données](#-base-de-données)
- [Rôles et Permissions](#-rôles--permissions)
- [Déploiement](#-déploiement)

---

## 🎯 Aperçu

GSS Access permet de :

- **Inscrire** les visiteurs avec détection automatique de doublons
- **Scanner** les entrées/sorties par salle via QR code
- **Suivre** l'occupation des salles en temps réel
- **Gérer** des programmes éducatifs avec suivi de présence
- **Générer** des rapports d'assiduité et des statistiques

---

## ✨ Fonctionnalités

### 👥 Gestion des visiteurs
- Formulaire d'inscription complet (nom, téléphone, quartier, profession, institution, photo…)
- Détection de doublons par similarité de nom
- Carte numérique avec QR code unique par visiteur

### 🏠 Suivi des salles en temps réel
| Salle | Capacité | Sortie auto |
|---|---|---|
| Salle Informatique | 20 places | 9h ou manuelle |
| Salle Polyvalente | Illimitée | Durée ajustable |
| Jardin | Illimité | Durée ajustable |

- Dashboard avec occupation live (Supabase Realtime)
- Alertes de capacité et compte à rebours coloré
- Sortie automatique via cron job (toutes les 5 min)

### 📚 Programmes éducatifs
- Création de programmes avec sous-programmes (filières)
- Ajout de participants par recherche dans la base visiteurs
- Rôles : Élève / Mentor
- Sessions de cours avec pointage QR
- Cron job automatique à 20h : marquage absent si non pointé
- Rapports d'assiduité avec taux de présence

### 🔐 Administration
- Gestion des comptes utilisateurs (création, modification, suppression)
- Réinitialisation de mot de passe avec génération aléatoire
- Sauvegarde complète de la BDD en JSON (bouton admin)
- Système RBAC avec 3 rôles (Admin, Directeur, Réception)

---

## 🛠 Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 · TypeScript · Vite |
| UI | Tailwind CSS · shadcn/ui · Lucide Icons |
| Data | TanStack React Query |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + Realtime) |
| QR | html5-qrcode (scan) · qrcode.react (génération) |
| Charts | Recharts |
| PDF | jspdf |

---

## 🚀 Installation locale

### Prérequis

- Node.js ≥ 18
- npm ou bun

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/Kukubeno/gssaccess.git
cd gssaccess

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
# Créer un fichier .env avec :
#   VITE_SUPABASE_URL=<votre_url_supabase>
#   VITE_SUPABASE_PUBLISHABLE_KEY=<votre_anon_key>

# 4. Lancer le serveur de développement
npm run dev
```

L'app sera accessible sur `http://localhost:5173`

---

## 📁 Structure du projet

```
src/
├── components/
│   ├── AppLayout.tsx          # Layout sidebar responsive
│   ├── ProtectedRoute.tsx     # Guard auth + rôle
│   ├── MembershipCard.tsx     # Carte membre QR
│   └── ui/                    # Composants shadcn/ui
├── hooks/
│   ├── useAuth.tsx            # Context authentification
│   └── use-toast.ts           # Notifications toast
├── lib/
│   ├── supabase-store.ts      # CRUD visiteurs/visites + realtime
│   ├── program-store.ts       # CRUD programmes/participants
│   └── duplicate-check.ts     # Détection doublons
├── pages/
│   ├── Dashboard.tsx          # Tableau de bord temps réel
│   ├── Scanner.tsx            # Scan QR entrées/sorties
│   ├── Programs.tsx           # Gestion programmes
│   ├── ProgramAttendance.tsx  # Pointage présence
│   ├── ProgramReport.tsx      # Rapports d'assiduité
│   ├── UserManagement.tsx     # Gestion utilisateurs
│   └── ...

supabase/functions/
├── auto-checkout/             # Sortie auto (cron */5 min)
├── mark-absent-cron/          # Absent auto (cron 20h00)
├── backup-database/           # Export JSON (admin)
├── create-user/               # Création compte
├── delete-user/               # Suppression compte
├── update-user-role/          # Modification rôle
└── reset-password/            # Reset mot de passe
```

---

## 🗄 Base de données

### Schéma

```
visitors ──────────< visits
    │
    └──(recherche)──> program_participants ──< program_attendance
                            │                        │
                        programs ──< program_sessions ┘
                            │
                        sub_programs

profiles (auth users)
user_roles (RBAC)
```

### Tables principales

| Table | Description |
|---|---|
| `visitors` | Visiteurs inscrits (nom, téléphone, quartier, etc.) |
| `visits` | Historique check-in / check-out par salle |
| `programs` | Programmes éducatifs |
| `sub_programs` | Sous-programmes / filières |
| `program_participants` | Participants rattachés à un programme |
| `program_sessions` | Dates de sessions |
| `program_attendance` | Présence par session (present / absent / en_attente) |
| `profiles` | Profils utilisateurs système |
| `user_roles` | Rôles : `admin` · `director` · `reception` |

---

## 🔐 Rôles & Permissions

| Action | Admin | Directeur | Réception |
|---|:---:|:---:|:---:|
| Dashboard & scanner | ✅ | ✅ | ✅ |
| Inscription visiteurs | ✅ | ✅ | ✅ |
| Créer/modifier programmes | ✅ | ✅ | ❌ |
| Supprimer données | ✅ | ❌ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ |
| Backup BDD | ✅ | ❌ | ❌ |

---

## 🌐 Déploiement

### Lovable (recommandé)

L'app est hébergée et publiée via [Lovable](https://lovable.dev). Les changements se synchronisent automatiquement avec ce repo GitHub.

### cPanel (Apache)

Le fichier `public/.htaccess` gère le routing SPA :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

```bash
npm run build
# Uploader le contenu de dist/ sur cPanel
```

---

## 👤 Auteur

Développé pour **Gitega Study Space** — Burundi

*Construit avec [Lovable](https://lovable.dev)*
