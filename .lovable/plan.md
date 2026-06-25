# Library Management

A new module to manage the library: catalog books, track on-site readers (scan in/out), and lend books with a return deadline.

## Scope

### 1. Books catalog
- Register a new book with full identifiers: title, author(s), ISBN, category, language, publisher, publication year, edition, copies total, location/shelf, cover photo, description, status (available / unavailable).
- List view with:
  - search (by title, author, ISBN, code)
  - sort (title, author, year, date added)
  - filter by category / language / availability
  - barcode/QR scan to instantly find a book by its internal code or ISBN
- Each book gets a unique internal QR code (printable) for fast scanning.

### 2. On-site reading (scan in / out)
- Page "Library Entry" with a scanner:
  - Scan visitor membership ID → start a reading session (check-in).
  - Scan again → close the session (check-out).
  - Optionally scan one or several book codes attached to the session (books consulted on site, not borrowed).
- Active readers list showing who is currently in the library with time elapsed.

### 3. Loans (taking a book home)
- Issue a loan: scan visitor ID + scan book code, choose a due date (default: 7 days, configurable when issuing).
- Return: scan book code → mark loan as returned.
- Loan list with filters: active / returned / overdue. Overdue loans highlighted in red.
- A book cannot be loaned if no copy is available.

### 4. Permissions
- New module `library` in the permissions system (view / create / update / delete).
- Admin + American Center: full access. Other roles: configurable via Access Control.

## Technical details

### Database (one migration)
- `library_books` — title, authors, isbn, internal_code (unique), category, language, publisher, year, edition, copies_total, copies_available, shelf, cover_url, description, status.
- `library_visits` — visitor_id, checked_in_at, checked_out_at, books_consulted (text[] of book codes).
- `library_loans` — visitor_id, book_id, loaned_at, due_at, returned_at, status (active/returned/overdue), issued_by, returned_by.
- Trigger on `library_loans` to decrement/increment `copies_available` on insert/return.
- Extend `app_module` enum with `'library'`.
- RLS: authenticated can read; create/update/delete gated by `has_permission(auth.uid(), 'library', ...)`.
- GRANTs to authenticated + service_role.

### Frontend
- New pages under `src/pages/`:
  - `LibraryBooks.tsx` — catalog + add/edit dialog + scan-to-find
  - `LibraryEntry.tsx` — scan check-in/out for on-site reading + active readers
  - `LibraryLoans.tsx` — issue/return loans + loan list with overdue filter
- Sidebar group "Library" with the three entries, gated by `library` permission.
- Routes added to `App.tsx` with `ProtectedRoute` requiring `library.view`.
- Reuse existing `html5-qrcode` scanner component pattern from `Scanner.tsx`.
- Add `library` to `AccessControl.tsx` module list and to translations (`en.json`).

### Out of scope (ask later if needed)
- Reservations / waiting list
- Fines for late returns
- Member-facing self-service portal
- Notifications/SMS reminders
