# Release preparation records

These maintainer records are not included in npm packages. No release tool or
Changesets automation is installed by this directory; reviewed drafts are consumed
manually into the owning package's cumulative `CHANGELOG.md` during preparation.

Core 0.2.0 is already published. Its `beta` and `latest` tags identify 0.2.0, and
its successful `npm-core` Deployment is retained. Do not republish Core, move its
`appkit-core-v0.2.0` tag or recreate its Release for React's adoption.

React 0.2.0 is prepared with an exact Core 0.2.0 dependency. Its reviewed draft
has been consumed into [the cumulative React changelog](../packages/appkit-react/CHANGELOG.md).
That version entry is the canonical source for its later GitHub Release body;
preparing or merging it does not publish the package.

The next sequence is:

1. Review and merge the React preparation PR after the strict React/Core adoption
   gate, affected checks and isolated packed-consumer checks pass.
2. Wait for successful main Public quality on the exact merged source commit.
   Tag and GitHub Release creation require separate authorization.
3. An authorized stable `appkit-react-v0.2.0` Release starts the staged-publication
   workflow merged in PR #13. Inspect and approve the npm stage with maintainer
   2FA, then manually complete using the original successful staging run ID.
   A successful staging run alone does not mean publication is complete.
4. Confirm the tested public archive, `beta` and `latest` mappings and successful
   `npm-react` Deployment. Leave existing versions and Core's publication intact.

Preparation checks do not certify the eventual merged commit. The Release workflow
will require exact-commit main quality and verify its packed archives again before
staging. Local archives and receipts remain under ignored `.verification/`; they
are not shipped as release notes. See [Releasing](../RELEASING.md) for approval,
completion and recovery details.
