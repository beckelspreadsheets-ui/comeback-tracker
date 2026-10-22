# Getting Penguin Kart onto iPhones — owner checklist

Two tracks that run in parallel. Track A gets the game onto YOUR phone this
week with no paid account. Track B is the paid membership the App Store
needs; it has a waiting period, so start it early. Requirements checked
against developer.apple.com on 2026-10-22.

## Track A — your own iPhone, free (today)

1. On the office Mac, open Terminal and run
   `sudo xcodebuild -license accept` (asks for your Mac password).
2. Tell Claude. Claude runs `npm run ios:sync`, opens the project in Xcode
   and switches the bundle id to `com.showcasedesigns.penguinkart.dev` for
   this free build only (never committed) — a free team that signs the real
   id can claim it, and the company account needs it later.
3. In Xcode › Settings › Accounts, add your normal Apple ID; it becomes a
   free "Personal Team". Pick that team under the App target's Signing &
   Capabilities.
4. Plug in the iPhone, pick it as the run target, press Run. The first time,
   on the phone: Settings › General › VPN & Device Management › trust the
   developer. A free-team install expires after 7 days; re-run to renew.

This is enough for the phone feel check (drift flick, the dither on close
rivals, frame rate via Pause › Performance) and for finding iOS-only bugs
before anyone else sees the game.

## Track B — Apple Developer Program as Showcase Designs ($99 / year)

Apple's rules for an organisation:

1. **A real legal entity.** Showcase Designs must be registered as an LLC
   or corporation. DBAs, trade names and fictitious names are not accepted.
   The legal name is what the App Store shows as the seller.
2. **A D-U-N-S number** for that exact legal name and address. Check or
   request it at https://developer.apple.com/support/D-U-N-S/ — this is the
   slow step (Dun & Bradstreet issues it, then Apple has to receive it), so
   do it first.
3. **Authority to sign** for the company (owner/founder qualifies).
4. **A live website on the company's own domain** with real content (not a
   social page or a parked domain), and **a work email on that domain** —
   andrew@showcase-designs.com fits if showcase-designs.com is the site.
5. **An Apple Account with two-factor authentication on**, your legal first
   and last name in the name fields (no nickname or company name there),
   ideally signed up with the company email.
6. Enroll: https://developer.apple.com/programs/enroll/ (or the Apple
   Developer app on the iPhone). Apple verifies the entity, D-U-N-S, phone,
   email and website — they may phone you — then you accept the licence
   agreement and pay.

## When Track B is approved

Tell Claude. Next steps are Claude's: the App Store Connect record (bundle id
`com.showcasedesigns.penguinkart`, permanent once created), signing, the
first TestFlight upload with the copy in docs/APP_STORE_LISTING.md, then the
group's fun check (docs/RELEASE_V1_PLAN.md, Phase 3).
