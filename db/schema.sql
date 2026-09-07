-- CLARUM Client Portal database schema (Azure SQL Database)
-- Run this once against the provisioned database before the app is used.
-- See SETUP.md for how to provision the database and wire the connection string.

CREATE TABLE staff (
    id INT IDENTITY(1,1) PRIMARY KEY,
    oid UNIQUEIDENTIFIER NOT NULL UNIQUE,
    email NVARCHAR(320) NOT NULL UNIQUE,
    display_name NVARCHAR(200) NOT NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
    status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE clients (
    id INT IDENTITY(1,1) PRIMARY KEY,
    oid UNIQUEIDENTIFIER NOT NULL UNIQUE,
    email NVARCHAR(320) NOT NULL UNIQUE,
    full_name NVARCHAR(200) NOT NULL,
    title NVARCHAR(200) NOT NULL DEFAULT 'Client',
    organization NVARCHAR(200) NOT NULL,
    phone NVARCHAR(50) NOT NULL DEFAULT 'Not provided',
    mailing_address NVARCHAR(500) NOT NULL DEFAULT 'Not provided',
    client_since NVARCHAR(50) NOT NULL DEFAULT 'Not provided',
    preferred_contact NVARCHAR(10) NOT NULL DEFAULT 'Email' CHECK (preferred_contact IN ('Email', 'Phone')),
    engagements NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE documents (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    client_oid UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(400) NOT NULL,
    category NVARCHAR(50) NOT NULL,
    file_type NVARCHAR(20) NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'needs_attention', 'pending_review')),
    attention_reason NVARCHAR(500) NULL,
    content_type NVARCHAR(200) NOT NULL DEFAULT 'application/octet-stream',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    uploaded_by_oid UNIQUEIDENTIFIER NOT NULL,
    uploaded_by_role NVARCHAR(10) NOT NULL CHECK (uploaded_by_role IN ('client', 'admin')),
    uploaded_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_documents_client FOREIGN KEY (client_oid) REFERENCES clients(oid)
);
CREATE INDEX IX_documents_client_oid ON documents(client_oid);

-- Preserve the one client that already exists as a real Entra local account
-- (created manually before this schema existed). Safe to remove this insert
-- if that account no longer exists or you'd rather add it via the admin UI.
INSERT INTO clients (oid, email, full_name, title, organization, phone, mailing_address, preferred_contact, status)
VALUES (
    'e7468903-52b6-4e96-97ca-239c0ec6188a',
    'prakash@prcanalytics.com',
    'PRC ANALYTICS INC',
    'Client',
    'PRC ANALYTICS INC',
    'Not provided',
    'Not provided',
    'Email',
    'active'
);
