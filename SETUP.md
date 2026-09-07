# Setup: database + account provisioning

This adds a real database and admin-managed client/staff accounts, replacing the hardcoded
single client and single admin email. Three things need to be provisioned in Azure before this
works: a SQL database, its schema, and a second app registration used only for creating accounts.

## 1. Azure SQL Database

1. In the Azure Portal, create a SQL Database (Basic or Standard S0 tier is plenty for this
   workload — a few dollars/month). Server-level admin auth is fine; you don't need Entra-only
   auth for this.
2. Under the SQL server's networking settings, allow Azure services to access the server (so
   the Function App can reach it).
3. Copy the ADO.NET connection string from the database's "Connection strings" blade, fill in
   the password, and set it as a Function App setting named:

   ```
   AZURE_SQL_CONNECTION_STRING
   ```

4. Run `db/schema.sql` against the new database once (Azure Portal Query Editor, Azure Data
   Studio, or `sqlcmd`). It creates the `staff`, `clients`, and `documents` tables and seeds the
   one client that already exists ("PRC ANALYTICS INC").

## 2. App registration for account provisioning

The admin UI creates client/staff sign-in accounts automatically via Microsoft Graph. That
needs its own app registration **inside the CLARUM Clients tenant** (a different one from the
`728b382c-...` app the portal itself signs in through):

1. In the Entra admin center, switch to the **CLARUM Clients** tenant (top-right account
   switcher — you were just there as `prakash@clarumcpa.com`, Global Administrator).
2. App registrations → New registration → name it something like `clarum-portal-provisioning`.
   No redirect URI needed (this is a background service, not something users sign into).
3. API permissions → Add a permission → Microsoft Graph → **Application permissions** →
   `User.ReadWrite.All` → Add, then click **Grant admin consent** (only a Global Administrator
   can do this — that's you).
4. Certificates & secrets → New client secret → copy the value immediately (it's only shown
   once).
5. Set these Function App settings:

   ```
   GRAPH_CLIENT_ID       = <the new app registration's Application (client) ID>
   GRAPH_CLIENT_SECRET   = <the client secret value from step 4>
   ```

   (`GRAPH_TENANT_ID` doesn't need to be set — it defaults to the CLARUM Clients tenant.)

## 3. First admin sign-in

The `staff` table starts empty. The **first person who signs in with the email in
`BOOTSTRAP_ADMIN_EMAIL`** (defaults to `prakash@clarumcpa.com` if you don't set it) is
automatically made the first admin — no manual SQL insert needed. After that, admins are
managed entirely from the Staff screen in the app.

That first sign-in still needs a **local account** to exist for that email in the CLARUM
Clients tenant (Users → New user → Create new external user, sign-in method Email, value
`prakash@clarumcpa.com`, set a password) — the account itself isn't created by this app, only
its *admin role* is granted automatically on first login. Every client and staff member added
after that is created automatically by the app.

## What changed for existing data

- The one existing client ("PRC ANALYTICS INC") is preserved via a seed row in `db/schema.sql`
  — same Entra object ID, so their existing sign-in keeps working.
- Any documents already uploaded under the old blob-metadata scheme won't show up in the
  Documents list after this change (metadata now lives in SQL, not blob metadata). If there are
  real files to preserve, let me know and I'll write a one-time backfill script that reads the
  existing blob metadata and inserts matching rows into the `documents` table.
