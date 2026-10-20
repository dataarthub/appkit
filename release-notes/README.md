# Release preparation records

These maintainer records are not included in npm packages. No release tool or
Changesets automation is installed by this directory; reviewed drafts are consumed
manually into the owning package's cumulative `CHANGELOG.md` during preparation.

The current sequence is:

1. PR #11's affected quality and exact-commit publication gate is merged into
   main. Base the preparation PR on that main history.
2. Review the `release/core-0.2.0` preparation: only Core's package version advances
   to 0.2.0. Its `CHANGELOG.md` is the canonical Core release body source.
3. After an authorized preparation commit/PR is merged, wait for successful main
   Public quality on the selected commit. Only separately authorized tag/Release
   actions may start Core publication. Before 1.0.0 both npm `beta` and `latest`
   must resolve to the verified version; existing 0.1.0 archives stay immutable.
4. After Core 0.2.0 exists in npm, prepare React 0.2.0 from its
   [unreleased draft](appkit-react-0.2.0.draft.md), adopting the exact Core version
   in a separate PR and verifying both compatibility lanes before publication.

A working-tree candidate has no final commit-bound archive or main CI success yet.
Local tarballs and receipts are retained under ignored `.verification/`; they must
be regenerated/reverified for the final source commit and are never shipped as
release notes. No package is published by preparing these records.
