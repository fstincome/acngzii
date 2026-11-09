# Roadmap

## Remove dead modules (Library + Restaurant)

- [x] Delete Library pages + store (`LibraryBooks`, `LibraryEntry`, `LibraryLoans`, `library-store`)
- [x] Delete Restaurant pages + libs (`Restaurant*`, `OrderTracking`, `restaurant-store`, `whatsapp-order`, `invoice`, `InvoiceActions`)
- [x] Strip imports + routes from `src/App.tsx`
- [x] Strip sidebar groups, state, JSX and unused icons from `src/components/AppLayout.tsx`
- [x] Drop `library` from permissions (`usePermissions.AppModule`, `AccessControl.MODULES`)
- [x] Remove dead nav/translation keys from `src/i18n/locales/en.json`
- [x] Mark DB tables deprecated (data kept, nothing dropped)
- [x] Verify: build OK, all 10 removed URLs return the 404 page

## Open

- [ ] Sign-in check of the sidebar — blocked: this remix's backend has **0 staff accounts**, so nobody can log in to view the menu. Needs an admin account created (or the original backend connected).
