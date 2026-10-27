# SMARTTRUST 1.0.0 — release preparation

Theme: 454065047. Repository: sorouhshamico-pixel/smarttrust.

## Listing copy

Arabic: ثيم معماري فاخر لمتاجر أنظمة المنازل الذكية: KNX وZigbee وControl4.

English: An architectural, premium theme for smart-home system stores: KNX, Zigbee and Control4.

Support email: zalfuwayris@smartrust.com.sa

Support website: https://smartrust.com.sa

Availability required: private, for the verified SMARTTRUST store. This setting must be verified in Partners Portal; package.json private=true only controls npm publishing.

## Changelog — 1.0.0, 2026-10-17

- Initial SMARTTRUST release with eleven configurable homepage components.
- Desktop navigation and responsive header/footer.
- Salla product images, prices, options, search and cart integration.
- Customer wallet and testimonials templates; public information page layouts.
- Fallbacks for blank collection items inserted by Salla's editor.
- Restore approved theme description and support URL; regenerate production assets.

## Validation

Production webpack build: passed. Static verify: passed (69 settings, 11 components, 44 Twig templates, 224 locale keys). git diff --check: passed.

No matches for surooh, صروح or الشامي in tracked src, public and twilight.json text. GitHub owner sorouhshamico-pixel is retained because it is the authorized repository, not customer-facing store identity. Historical reports mention previous audits and repository ownership.

The release was prepared in an isolated checkout. Original workspace changes were not included. Production assets are regenerated from unchanged source; chunk filenames and their references change together.

## Publication blockers

- No browser session is connected. Private availability, listing fields, category, price and portal synchronization cannot be verified here.
- No verified screenshots are available for upload. Prepare at least four real screenshots covering desktop and mobile, with Arabic/English titles and descriptions, and check current portal dimensions. Do not substitute generated mockups.
- Live-store request 1396223358 was reported Accepted by the owner, but its target store and private preview have not been independently verified.
- Current live-store functional and responsive QA has not been completed. Prior demo-store results are recorded separately and do not prove the live-store preview.
- No publication request has been sent and no request ID exists for this release at preparation time.

## Continuing development

Keep developing on salla-deploy. For each release, build and verify, inspect the diff, merge the tested commit into master without force push, verify Salla synchronization, and submit an updated publication request. Salla requires review for later private-theme updates too. Do not activate a live-store theme without separate owner authorization.

Official references:
- https://docs.salla.dev/421880m0
- https://docs.salla.dev/421889m0
- https://docs.salla.dev/421879m0
