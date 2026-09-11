# Setup: SharePoint documents and portal accounts

Client documents are stored in the existing **CLARUMCPA Team Site**. The API uses Microsoft
Graph with **Sites.Selected** (write access to that site only). Azure Blob Storage and Azure
SQL are not used.

Portal sign-in stays on **CLARUM Clients** (Entra External ID). SharePoint lives in the
**CLARUM CPA Microsoft 365** tenant. Those are different directories.

## SharePoint site (already created)

Use this site. Do not create another one.

- Site: **CLARUMCPA Team Site**
- URL: https://clarumcpa.sharepoint.com
- Library: Documents (`/Shared Documents`)
- `GRAPH_TENANT_ID` = `9720f802-3a92-40d5-9be2-edac49437dcb`
- `SHAREPOINT_SITE_ID` = `clarumcpa.sharepoint.com,0bd61bf5-50d6-4a26-be7c-acec30d47f12,8b0a3862-9c7b-44a4-aff9-e56876354b8d`
- `SHAREPOINT_DRIVE_ID` = `b!9RvWC9ZQJkq-fKzsMNR_EmI4Cot7nKREr_nlaHY1S42Wry56NrjrSKRrFVdzrBNT`

The portal creates client folders automatically:

Permanent, Accounting, Tax, Advisory, Workpapers, Client Shared, Client Uploads.

## App registration for SharePoint (Microsoft 365 tenant)

Do **not** reuse the CLARUM Client Portal SPA in the CLARUM Clients tenant for this.

1. Switch to the **CLARUM CPA** (clarumcpa.com) directory.
2. App registrations → New registration → `clarum-portal-sharepoint`.
   Accounts in this organizational directory only. No redirect URI.
3. Certificates & secrets → New client secret → copy the value.
4. API permissions → Microsoft Graph → **Application** permissions → `Sites.Selected` → Add.
5. Grant admin consent for CLARUM CPA.

`Sites.Selected` does not grant access by itself. A Global Admin must grant this app
**write** on CLARUMCPA Team Site once.

In Graph Explorer (signed in as a CLARUM CPA admin):

```
POST https://graph.microsoft.com/v1.0/sites/clarumcpa.sharepoint.com,0bd61bf5-50d6-4a26-be7c-acec30d47f12,8b0a3862-9c7b-44a4-aff9-e56876354b8d/permissions
```

```json
{
  "roles": ["write"],
  "grantedToIdentities": [
    {
      "application": {
        "id": "<GRAPH_CLIENT_ID>",
        "displayName": "clarum-portal-sharepoint"
      }
    }
  ]
}
```

## SWA application settings

```
GRAPH_TENANT_ID          = 9720f802-3a92-40d5-9be2-edac49437dcb
GRAPH_CLIENT_ID          = <clarum-portal-sharepoint application (client) ID>
GRAPH_CLIENT_SECRET      = <client secret>
SHAREPOINT_SITE_ID       = clarumcpa.sharepoint.com,0bd61bf5-50d6-4a26-be7c-acec30d47f12,8b0a3862-9c7b-44a4-aff9-e56876354b8d
SHAREPOINT_DRIVE_ID      = b!9RvWC9ZQJkq-fKzsMNR_EmI4Cot7nKREr_nlaHY1S42Wry56NrjrSKRrFVdzrBNT
```

## Creating client sign-in accounts

Add client still uses the signed-in administrator in **CLARUM Clients**, with delegated
`User.ReadWrite.All` on the existing portal app (`728b382c-...`). That is separate from
SharePoint Sites.Selected.
