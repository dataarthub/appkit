# Release preparation records

These maintainer records are not included in npm packages. No release tool or
Changesets automation is installed by this directory; reviewed drafts are consumed
manually into the owning package's cumulative `CHANGELOG.md` during preparation.
A prepared version entry is not publication evidence or permission to publish.

## Current Core 0.2.2 and React 0.3.1 preparation

Core 0.2.2 corrects duplicate createAjvValidator declaration remarks. React 0.3.1
corrects GenerativeUIRenderer and KanbanColumnFrame remarks. All explanatory text
is retained; these corrections change no runtime statements or callable types.
The generic source JSDoc check is part of the ordinary documentation gate.

The prepared React dependency remains exact, published Core **0.2.1** for now:

1. Verify, separately authorize and publish Core **0.2.2** through its normal
   staged-release flow, then confirm exact npm identity/content, required tags and
   the successful `npm-core` Deployment.
2. Only after that confirmation, change the prepared React **0.3.1** dependency to
   exact Core **0.2.2**. Refresh its lockfile, generated metadata and final
   changelog/host instructions; rerun React/Core and isolated packed consumers.
3. After reviewed main source quality and separate authorization, publish React
   **0.3.1** through its own staging/2FA/completion flow and confirm actual delivery.

Do not use an unpublished dependency, source link or production archive override
while waiting. Core 0.2.0/0.2.1 and React 0.3.0 are immutable; do not move their
existing tags or republish them. Historical preparation notes are retained in the
[cumulative Core changelog](../packages/appkit-core/CHANGELOG.md) and
[React changelog](../packages/appkit-react/CHANGELOG.md).

See [Releasing](../RELEASING.md#core-022-and-react-031-staged-documentation-preparation)
for the required checkpoints. Local candidates remain in ignored `.verification/`
storage; no merge, tag, publication or deployment follows from preparation alone.
