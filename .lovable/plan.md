
# American Corner Management System — Adaptation Plan

## 1. Audit of the existing platform

The current app ("GSS Access — Gitega Study Space") is already a study-space / member management system. Most of what you need already exists — we mostly need to **rename, re-scope, and add a Library module**.

### 1.1 Existing modules (routes in `src/App.tsx`)

| Route | Module | Reuse for American Corner |
|---|---|---|
| `/` Dashboard | Today's visitors, room occupancy, program stats, restaurant accounting | Keep, retarget KPIs (members, library, lab, programs) |
| `/register` RegisterVisitor | Visitor + Scholarship registration with duplicate check | Rename to **Member Registration**, extend member types |
| `/visitors` Visitors | Visitor directory | Rename to **Members** |
| `/scanner` Scanner | QR check-in/out into rooms | Reuse for Library visits + Computer Lab sessions |
| `/statistics` Statistics | Attendance analytics | Extend with library & lab dashboards |
| `/programs`, `/program-attendance`, `/program-report` | Programs, sessions, attendance, tasks | Reuse as-is for Workshops / English Clubs / STEM / Entrepreneurship / Cultural events |
| `/formulaire` RegistrationForm | Printable A4 paper form | Keep, re-brand |
| `/card/:visitorId` DigitalCard | Member digital card + QR | Keep |
| `/users` UserManagement | Staff/roles | Keep |
| `/restaurant/*` (6 routes) | Full restaurant/POS module | **Remove from nav** (out of scope) — keep code dormant to avoid regressions |

### 1.2 Existing database tables (Lovable Cloud)

Reusable as-is or with minor extension:
- `visitors` → **members** (add `member_type`, `age_group`, `membership_status`)
- `visits` → reused for Library visits + Computer Lab sessions (already has `room` enum: `computer_lab`, `multipurpose_room`, `garden`)
- `programs`, `sub_programs`, `program_sessions`, `program_participants`, `program_attendance`, `program_tasks` → fits Workshops / Clubs / Trainings exactly
- `scholarship_applications` → keep (entrepreneurship / scholarship track)
- `profiles`, `user_roles` → keep (Admin / Director / Reception)

To add (Library only):
- `books` (catalog)
- `book_loans` (borrow / return history)

To leave dormant (restaurant): `products`, `orders`, `order_items`.

### 1.3 Reusable components
`AppLayout`, `NavLink`, `LanguageSwitcher`, `ProtectedRoute`, `MembershipCard`, `ScholarshipTasksDialog/Overview`, all `ui/*` shadcn primitives, duplicate-check & membership-card libs, i18n (EN/FR).

### 1.4 Gaps vs. American Corner requirements
1. Member typology (Student / Professional / Entrepreneur / Visitor / Volunteer) not modeled.
2. No Library catalog / loans.
3. Computer Lab "session" exists as a room visit but lacks duration/category reporting view.
4. Statistics page lacks library + lab dashboards.
5. Branding still says "Gitega Study Space".

## 2. Incremental implementation plan

Each phase is shippable and does **not** break existing flows.

### Phase 1 — Rebrand & navigation (frontend only, no DB)
- Update `src/i18n/locales/{en,fr}.json` app name + tagline → "American Corner".
- Update `AppLayout` nav groups: rename "Normal Attendance" → "Library & Lab", relabel pages (Visitors → Members, etc.).
- Hide restaurant nav group behind a feature flag (`VITE_ENABLE_RESTAURANT=false`); routes remain mounted.
- Update `README.md` and `public/DOCUMENTATION.md`.

### Phase 2 — Member typology (small DB extension)
Migration adds to `visitors`:
- `member_type` enum: `student | professional | entrepreneur | visitor | volunteer | member`
- `age_group` text (auto-computed from `date_of_birth` when present, otherwise selectable: `<18`, `18-25`, `26-35`, `36-50`, `50+`)
- `membership_status` enum: `active | inactive | pending`
- `membership_start_date`, `membership_end_date` (nullable)

Update:
- `RegisterVisitor.tsx`: add member-type selector & status; keep Scholarship tab as Entrepreneurship track.
- `Visitors.tsx`: filter by type/status; show new columns.
- `Dashboard.tsx`: members KPIs (total, new this month, gender split).

### Phase 3 — Library Visits & Computer Lab (reuse `visits`)
No schema change.
- Extend room enum semantically: `computer_lab` = Computer Lab; `multipurpose_room` = Library reading area; `garden` stays or is rebranded "Outdoor".
- Add **Library Visit** quick-entry on Scanner (purpose of visit field stored in a new optional `visit_purpose` column — single tiny migration).
- New page `LabReport.tsx` (or section in Statistics): sessions count, total hours, by user category, by day/month.

### Phase 4 — Library module (only real new feature)
Migration:
- `books` (title, author, isbn, category, language, total_copies, available_copies, cover_url, shelf_code)
- `book_loans` (book_id, member_id (=visitor_id), borrowed_at, due_at, returned_at, status)
- RLS + GRANTs per project rules; updated_at trigger.

New pages (reusing existing shadcn patterns):
- `/library/books` — catalog CRUD (admin/director).
- `/library/loans` — borrow / return workflow with member search (reuse duplicate-check fuzzy search).
- `/library/history` — borrowing history & top borrowers / most borrowed.

### Phase 5 — Statistics unification
Extend `Statistics.tsx` with tabs:
1. **Membership** — totals, new registrations, gender, age distribution.
2. **Programs** — already covered, just relabel.
3. **Library** — visitors, loans, popular books, active borrowers.
4. **Computer Lab** — sessions, hours, user categories.

Daily / monthly / annual toggles using existing date-range patterns.

### Phase 6 — Polish
- Update PWA `manifest.json` name/icons.
- Update digital card branding.
- Refresh memory files (`mem://index.md` + `mem://project/overview`).

## 3. What we will NOT do
- No rewrite of auth, RLS, or i18n.
- No removal of restaurant tables/routes (just hidden) to avoid regressions.
- No redesign of the design system — same tokens, same shadcn components.
- No breaking changes to existing programs / scholarship workflows.

## 4. Deliverables per phase
Each phase ends with: updated screens visible in the preview, a short changelog message, and (where relevant) one DB migration submitted for your approval before running.

---

### Confirm before I start

Please confirm:
1. Go ahead with **Phase 1 (rebrand + nav) immediately**, then proceed phase by phase?
2. Keep restaurant module hidden (recommended) or fully delete it?
3. Library member identifier = existing `visitor_id` (recommended, reuses QR + cards) — OK?
