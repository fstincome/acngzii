# Roadmap

## Remove dead modules (Library + Restaurant)

- [ ] Delete Library pages + store (`LibraryBooks`, `LibraryEntry`, `LibraryLoans`, `library-store`)
- [ ] Delete Restaurant pages + libs (`Restaurant*`, `OrderTracking`, `restaurant-store`, `whatsapp-order`, `invoice`, `InvoiceActions`)
- [ ] Strip imports + routes from `src/App.tsx`
- [ ] Strip sidebar groups, state and unused icons from `src/components/AppLayout.tsx`
- [ ] Drop `library` from permissions (`usePermissions.AppModule`, `AccessControl.MODULES`)
- [ ] Remove dead nav/translation keys from `src/i18n/locales/en.json`
- [ ] Mark DB tables deprecated (keep data, no drop)
- [ ] Verify: build clean, `/library/*` and `/restaurant/*` no longer resolve
