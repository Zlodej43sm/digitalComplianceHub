# Cloudflare environment reservations

Phase 1 uses only local Workers emulation and local build output. Names below are reserved in project documentation, not created cloud resources.

| Resource | Developer environment | Customer demo environment |
| --- | --- | --- |
| Worker | digital-compliance-hub-dev | digital-compliance-hub-demo |
| D1 | dch-dev-metadata | dch-demo-metadata |
| Private R2 | dch-dev-documents | dch-demo-documents |
| Analysis queue | dch-dev-analysis | dch-demo-analysis |
| Failed jobs queue | dch-dev-analysis-failed | dch-demo-analysis-failed |
| Hostname / Access app | To configure in Phase 2 | To configure before release |

`wrangler.jsonc` contains the Worker environment names only. It contains no fake database IDs, storage bindings, routes or credentials. D1/R2 provisioning and EU jurisdiction configuration belong to Phase 2; queue provisioning belongs to Phase 5. The same reserved names can be adjusted before resources are created.

Until identity is implemented, production builds render a setup page and exclude the local role-preview module. Public workers.dev and preview URLs are disabled in configuration. These are foundation precautions, not authentication. No deployment is performed in Phase 1.

Phase 2 must document the real resource IDs, scoped deployment credentials, provider/MFA setup, Access audience/issuer, hostname protection and alternate-route checks. Keep secrets outside Git and dev/demo accounts/resources isolated.
