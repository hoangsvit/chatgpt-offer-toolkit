# Public offer discovery — research (2026-11-26)

## Scope and decision

The existing extension checks Business eligibility and generates a checkout link after confirmation by ChatGPT. Keep that flow unchanged. Add an independent, public-information-only offer directory in a future iteration. A public campaign announcement does not establish account eligibility. No session tokens, private APIs, guessed campaign identifiers, redeem codes, automated checkout, payment submission, location spoofing or verification bypass belong in this module.

## Evidence reviewed

| Public source | Finding | Classification |
| --- | --- | --- |
| [OpenWorks](https://openai.com/openworks/) and [application FAQ](https://help.openai.com/en/articles/20001724-how-to-apply-to-openworks-and-follow-up-on-your-application) | Three months of Business at no cost for eligible independently owned US small businesses in the pilot. | Application-based; confirm application availability |
| [Malta partnership](https://openai.com/index/malta-chatgpt-plus-partnership/) | Plus access announced for Maltese citizens through an AI literacy initiative. | Regional; enrollment and duration need further verification |
| [Revolut UK terms](https://www.revolut.com/legal/chatgpt-3-months-trial-offer/) | Go three-month trial, campaign window 2026-07-30 through 2027-07-29 UTC; partner terms apply. | Partner trial; market-specific |
| [Business signup](https://help.openai.com/en/articles/8980713-sign-up-for-chatgpt-business) | Eligible new workspaces created November 23–30, 2026 receive double weekly included usage through December 31, 2026. | Usage benefit, not a free subscription |
| [Plus promotions](https://help.openai.com/en/articles/10492689-chatgpt-plus-promotions-and-referrals), [Go promotions](https://help.openai.com/en/articles/12501659-chatgpt-go-promotions-and-referrals), [trial invitations](https://help.openai.com/en/articles/8381046-chatgpt-promotional-subscriptionsfree-trial-invites-faq) | Offers vary by account, partner, region, payment method and prior redemption; some renew at normal rates. | Policy sources, not universal active campaigns |
| [Sea/Shopee partnership](https://www.sea.com/news/406) and [historical announcement](https://www.sea.com/news/377) | Partner distribution is worth tracking; current enrollment not established. | Watchlist |
| [Back to school](https://help.openai.com/en/articles/20001493-chatgpt-back-to-school-offer-for-students) | Four-month Plus offer described for 2026; do not advertise current enrollment without fresh confirmation. | Historical/watchlist |

No verified broadly available free Plus or Pro offer for Vietnam was established during this research.

## Proposed flow

1. Discovery: manually curate OpenAI News, Help Center, partner announcement pages and official terms. Use permitted feeds/search APIs where available; community posts are leads only.
2. Verification: locate primary evidence, record dates, plan, benefit type, countries, qualifying audience, payment/renewal conditions and date checked. If the source is blocked, missing or ambiguous, preserve the last evidence and mark needs_review. HTTP success alone is not proof of availability.
3. Deduplicate using a stable record ID and canonical official source; keep materially different partner/region terms separate. Never import personal invite URLs or single-user codes. Strip tracking parameters only when safe; retain official source URL.
4. Publish a reviewed catalog. Status values: announced, open, restricted, expired, needs_review. Only use open when enrollment is confirmed and a defined campaign window is current; a restricted entry may be current without being universally available. Distinguish free_trial, discount, usage_bonus, partner_benefit, and invite_program.
5. Extension UI: a separate Offers view with plan, country and benefit filters, evidence date, status, terms link and renewal note. Use bundled reviewed JSON first. An optional future remote catalog should be HTTPS-only, schema-validated, size-bounded, and treated as untrusted plain text; no HTML or remote executable code. Open official public links only on user click. No new broad browser permissions.
6. Notifications: optional, deduplicate by record ID and material change; notify only after review, never on raw discovery. No account identifiers or user data.

## Automation feasibility

A Node.js collector could run outside the extension, use permitted public sources, respect robots/terms, timeouts, rate limits, and conditional requests. Record source errors separately from campaign expiry. A review step must approve substantive changes before publication. Start with manual runs and offline fixtures. A future GitHub Actions schedule can run hourly, but [scheduled workflows execute from the default branch](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows); this research branch does not activate scheduled collection. Avoid deployment or release triggers.

## Acceptance criteria for implementation

- Existing eligibility, checkout and permissions remain unchanged.
- Validate dates, unique IDs, enums, HTTPS official sources, and required audience/benefit fields.
- Expired offers are not displayed as active; unknown dates are not guessed.
- A stale, unreachable or changed source yields review status, not a false positive.
- Country filters retain restricted/unknown states without assuming eligibility.
- UI supports light/dark modes, localized labels, empty/error states, and accessible navigation.
- Test malformed catalog, duplicate IDs, unknown region, date boundaries, missing evidence, malicious text/links and unchanged existing extension behavior.

## Deliverables and limitations

The companion seed catalog is a static research snapshot, not a live service or an eligibility checker. No collector, workflow, browser UI or checkout changes are implemented in this branch. No browser tests have been executed. Review the exact partner terms before adding enrollment links.
