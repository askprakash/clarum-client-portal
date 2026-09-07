# Setup: client and staff accounts

The portal stores clients, staff, and document metadata in the **same Azure blob storage**
already used for files (`DOCUMENT_STORAGE_CONNECTION`). A separate Azure SQL database is
not required.

Creating a client or staff account also creates a local sign-in in the **CLARUM Clients**
tenant. That uses Microsoft Graph with the **signed-in administrator** (Prakash@clarumcpa.com),
so you do not need a second app registration or client secret.

## One-time Graph permission

In the Entra admin center, stay in the **CLARUM Clients** tenant and open the existing
**CLARUM Client Portal** app (`728b382c-e6b6-4b99-bd67-8e24bc45d352`):

1. API permissions → Add a permission → Microsoft Graph → **Delegated permissions** →
   `User.ReadWrite.All` → Add.
2. Click **Grant admin consent for CLARUM Clients**.

The first time you add a client after that, Microsoft may show a consent or sign-in popup
once. After it succeeds, Add client creates the Entra account and shows the temporary
password.

## First admin sign-in

The staff list starts empty. The first person who signs in as
`prakash@clarumcpa.com` (or `BOOTSTRAP_ADMIN_EMAIL` if you set that app setting) is stored
as the first administrator automatically.

That email still needs a **local account** in the CLARUM Clients tenant (Users → New user →
Create new external user). Client and staff accounts added from the portal after that are
created automatically.

## Existing client

PRC ANALYTICS INC (`prakash@prcanalytics.com`) is seeded automatically the first time the
portal writes its metadata blob, using the same Entra object ID as today.
