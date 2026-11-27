# Contributing

Use the [issue chooser](https://github.com/hoangsvit/chatgpt-offer-toolkit/issues/new/choose) to report a bug or suggest an improvement. For regressions, include the extension version, browser, installation method, and steps to reproduce. Redact account details, session credentials, checkout links, and payment information from reports and screenshots.

## Set up the project

Use Node.js 22.12 or later. CI uses the version in `.nvmrc`. The project builds with npm and WXT.

```sh
npm install
npm run dev
npm run dev:firefox
```

Create a feature, fix, docs, or chore branch from the latest `dev` and target `dev` with your pull request. Only release pull requests from `dev` may target `main`. See [AGENTS.md](AGENTS.md) for the required workflow. Describe the user-visible change, how you verified it, and any cross-browser differences. Include light and dark screenshots for substantial popup changes when practical.

## Validate changes

```sh
npm run typecheck
npm test
npm run build:all
node scripts/check-manifest.mjs chrome
node scripts/check-manifest.mjs firefox
```

After building Chrome, you can run `npx playwright install chromium` and `npm run test:popup` for the popup smoke test. Use synthetic responses for tests involving account sessions, coupons, and checkout.

GitHub Actions runs validation for pull requests and pushes to `main`. Browser ZIPs from successful PR runs are available in the Actions artifacts. Same-repository PRs can also get a build-download comment. These previews expire after seven days. The `RUN_POPUP_PLAYWRIGHT` repository variable enables the optional visual smoke test in CI.

## Publish a GitHub release

1. Set `package.json` to a stable version greater than the latest stable GitHub release. Include the version bump on the development path before opening the release PR.
2. Open a release PR from `dev` to `main` and merge only after validation and approval. The release workflow validates and packages both browsers, creates `v<version>` at the validated commit when the tag is absent, and publishes that tag's GitHub Release.
3. Check the generated release notes, asset list, and tag. The notes begin with [installation and update instructions](.github/release-notes.md) and include GitHub-generated changes.

The workflow also supports a manual run on `main` or an existing `v<version>` tag that matches `package.json`. If a tag already exists, it must refer to the commit being released. Versions at or below the latest stable release are skipped.

Distribution is through GitHub Releases. The optional unlisted Firefox signing job can attach `firefox.xpi` and update the `firefox-updates` feed when `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` are configured. Unlisted signing produces an installable package for self-distribution without creating a public Firefox Add-ons listing.
