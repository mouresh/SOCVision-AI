-- =============================================================================
-- SOCVision AI — PostgreSQL Schema
-- Production-ready · UUID PKs · ENUMs · Indexes · Audit-ready
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for text search

-- ---------------------------------------------------------------------------
-- Utility: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE severity_level AS ENUM (
    'info',
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE alert_status AS ENUM (
    'new',
    'acknowledged',
    'in_progress',
    'resolved',
    'false_positive',
    'suppressed'
);

CREATE TYPE incident_status AS ENUM (
    'open',
    'investigating',
    'contained',
    'eradicated',
    'recovered',
    'closed',
    'cancelled'
);

CREATE TYPE asset_type AS ENUM (
    'endpoint',
    'server',
    'network_device',
    'cloud_instance',
    'container',
    'iot_device',
    'virtual_machine',
    'database',
    'application',
    'other'
);

CREATE TYPE agent_status AS ENUM (
    'active',
    'inactive',
    'disconnected',
    'pending',
    'updating',
    'error'
);

CREATE TYPE agent_platform AS ENUM (
    'windows',
    'linux',
    'macos',
    'freebsd',
    'other'
);

CREATE TYPE report_type AS ENUM (
    'executive_summary',
    'incident_report',
    'threat_intelligence',
    'compliance',
    'risk_assessment',
    'forensics',
    'custom'
);

CREATE TYPE report_status AS ENUM (
    'draft',
    'generating',
    'ready',
    'archived',
    'failed'
);

CREATE TYPE evidence_type AS ENUM (
    'log',
    'pcap',
    'memory_dump',
    'disk_image',
    'screenshot',
    'artifact',
    'file',
    'network_flow',
    'email',
    'other'
);

CREATE TYPE ioc_type AS ENUM (
    'ip_address',
    'domain',
    'url',
    'file_hash_md5',
    'file_hash_sha1',
    'file_hash_sha256',
    'email',
    'cve',
    'mutex',
    'registry_key',
    'user_agent',
    'other'
);

CREATE TYPE ioc_confidence AS ENUM (
    'low',
    'medium',
    'high',
    'confirmed'
);

CREATE TYPE risk_entity_type AS ENUM (
    'asset',
    'user',
    'incident',
    'alert'
);

CREATE TYPE audit_action AS ENUM (
    'create',
    'read',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'escalate',
    'assign',
    'acknowledge',
    'resolve',
    'suppress',
    'execute_playbook'
);

CREATE TYPE mitre_tactic AS ENUM (
    'reconnaissance',
    'resource_development',
    'initial_access',
    'execution',
    'persistence',
    'privilege_escalation',
    'defense_evasion',
    'credential_access',
    'discovery',
    'lateral_movement',
    'collection',
    'command_and_control',
    'exfiltration',
    'impact'
);

CREATE TYPE threat_intel_source AS ENUM (
    'internal',
    'osint',
    'isac',
    'commercial',
    'government',
    'partner'
);

-- =============================================================================
-- IDENTITY & ACCESS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(64) NOT NULL UNIQUE,
    description     TEXT,
    is_system_role  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------------------
CREATE TABLE permissions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    VARCHAR(64) NOT NULL,            -- e.g. 'alerts', 'incidents'
    action      VARCHAR(32) NOT NULL,            -- e.g. 'read', 'write', 'delete'
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_permissions_resource_action UNIQUE (resource, action)
);

CREATE TRIGGER trg_permissions_updated_at
    BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    username            VARCHAR(64)  NOT NULL UNIQUE,
    full_name           VARCHAR(128) NOT NULL,
    password_hash       TEXT         NOT NULL,
    mfa_secret          TEXT,
    mfa_enabled         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    is_superuser        BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMPTZ,
    last_login_ip       INET,
    failed_login_count  SMALLINT     NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    avatar_url          TEXT,
    timezone            VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    notification_prefs  JSONB        NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email         ON users (email);
CREATE INDEX idx_users_username      ON users (username);
CREATE INDEX idx_users_is_active     ON users (is_active);
CREATE INDEX idx_users_last_login_at ON users (last_login_at DESC);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE user_roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id     UUID        NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    granted_by  UUID        REFERENCES users (id) ON DELETE SET NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_roles UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- Role ↔ Permission join (many-to-many)
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);

-- =============================================================================
-- ASSETS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- asset_groups
-- ---------------------------------------------------------------------------
CREATE TABLE asset_groups (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(128) NOT NULL UNIQUE,
    description TEXT,
    parent_id   UUID        REFERENCES asset_groups (id) ON DELETE SET NULL,
    metadata    JSONB       NOT NULL DEFAULT '{}',
    created_by  UUID        REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_groups_parent_id ON asset_groups (parent_id);

CREATE TRIGGER trg_asset_groups_updated_at
    BEFORE UPDATE ON asset_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
CREATE TABLE assets (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname        VARCHAR(253)  NOT NULL,
    fqdn            VARCHAR(253),
    ip_addresses    INET[]        NOT NULL DEFAULT '{}',
    mac_addresses   MACADDR[]     NOT NULL DEFAULT '{}',
    asset_type      asset_type    NOT NULL DEFAULT 'other',
    os_name         VARCHAR(64),
    os_version      VARCHAR(64),
    criticality     severity_level NOT NULL DEFAULT 'medium',
    asset_group_id  UUID          REFERENCES asset_groups (id) ON DELETE SET NULL,
    owner_id        UUID          REFERENCES users (id) ON DELETE SET NULL,
    location        VARCHAR(128),
    cloud_provider  VARCHAR(32),
    cloud_region    VARCHAR(64),
    cloud_account   VARCHAR(128),
    tags            TEXT[]        NOT NULL DEFAULT '{}',
    metadata        JSONB         NOT NULL DEFAULT '{}',
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    first_seen_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_hostname        ON assets (hostname);
CREATE INDEX idx_assets_asset_type      ON assets (asset_type);
CREATE INDEX idx_assets_criticality     ON assets (criticality);
CREATE INDEX idx_assets_asset_group_id  ON assets (asset_group_id);
CREATE INDEX idx_assets_owner_id        ON assets (owner_id);
CREATE INDEX idx_assets_is_active       ON assets (is_active);
CREATE INDEX idx_assets_last_seen_at    ON assets (last_seen_at DESC);
CREATE INDEX idx_assets_tags            ON assets USING GIN (tags);
CREATE INDEX idx_assets_ip_addresses    ON assets USING GIN (ip_addresses);

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- AGENTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- agents  (Wazuh / EDR agents deployed on assets)
-- ---------------------------------------------------------------------------
CREATE TABLE agents (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_key       VARCHAR(64)    NOT NULL UNIQUE,         -- Wazuh agent ID or custom key
    asset_id        UUID           REFERENCES assets (id) ON DELETE SET NULL,
    name            VARCHAR(128)   NOT NULL,
    platform        agent_platform NOT NULL DEFAULT 'linux',
    version         VARCHAR(32),
    status          agent_status   NOT NULL DEFAULT 'pending',
    last_heartbeat  TIMESTAMPTZ,
    ip_address      INET,
    groups          TEXT[]         NOT NULL DEFAULT '{}',
    config          JSONB          NOT NULL DEFAULT '{}',
    labels          JSONB          NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_asset_id       ON agents (asset_id);
CREATE INDEX idx_agents_status         ON agents (status);
CREATE INDEX idx_agents_platform       ON agents (platform);
CREATE INDEX idx_agents_last_heartbeat ON agents (last_heartbeat DESC);

CREATE TRIGGER trg_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- MITRE ATT&CK
-- =============================================================================

-- ---------------------------------------------------------------------------
-- mitre_techniques
-- ---------------------------------------------------------------------------
CREATE TABLE mitre_techniques (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    technique_id    VARCHAR(16)   NOT NULL UNIQUE,     -- e.g. T1059, T1059.001
    name            VARCHAR(256)  NOT NULL,
    tactic          mitre_tactic  NOT NULL,
    description     TEXT,
    detection       TEXT,
    mitigation      TEXT,
    platforms       TEXT[]        NOT NULL DEFAULT '{}',
    data_sources    TEXT[]        NOT NULL DEFAULT '{}',
    is_subtechnique BOOLEAN       NOT NULL DEFAULT FALSE,
    parent_id       UUID          REFERENCES mitre_techniques (id) ON DELETE SET NULL,
    external_url    TEXT,
    version         VARCHAR(8)    NOT NULL DEFAULT '1.0',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_mitre_techniques_tactic    ON mitre_techniques (tactic);
CREATE INDEX idx_mitre_techniques_parent_id ON mitre_techniques (parent_id);
CREATE INDEX idx_mitre_techniques_platforms ON mitre_techniques USING GIN (platforms);
CREATE INDEX idx_mitre_techniques_name_trgm ON mitre_techniques USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_mitre_techniques_updated_at
    BEFORE UPDATE ON mitre_techniques
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ALERTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
CREATE TABLE alerts (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id         VARCHAR(128)   UNIQUE,               -- Splunk / Wazuh alert ID
    title               VARCHAR(512)   NOT NULL,
    description         TEXT,
    severity            severity_level NOT NULL DEFAULT 'medium',
    status              alert_status   NOT NULL DEFAULT 'new',
    source              VARCHAR(64)    NOT NULL,             -- 'splunk', 'wazuh', 'crowdstrike', …
    source_rule_id      VARCHAR(128),
    source_rule_name    VARCHAR(256),
    asset_id            UUID           REFERENCES assets (id) ON DELETE SET NULL,
    agent_id            UUID           REFERENCES agents (id) ON DELETE SET NULL,
    assigned_to         UUID           REFERENCES users (id) ON DELETE SET NULL,
    acknowledged_by     UUID           REFERENCES users (id) ON DELETE SET NULL,
    acknowledged_at     TIMESTAMPTZ,
    resolved_by         UUID           REFERENCES users (id) ON DELETE SET NULL,
    resolved_at         TIMESTAMPTZ,
    false_positive_note TEXT,
    risk_score          NUMERIC(5, 2)  CHECK (risk_score BETWEEN 0 AND 100),
    risk_level          VARCHAR(20)    CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    raw_event           JSONB          NOT NULL DEFAULT '{}',
    enrichment          JSONB          NOT NULL DEFAULT '{}',
    tags                TEXT[]         NOT NULL DEFAULT '{}',
    fired_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_severity       ON alerts (severity);
CREATE INDEX idx_alerts_status         ON alerts (status);
CREATE INDEX idx_alerts_source         ON alerts (source);
CREATE INDEX idx_alerts_asset_id       ON alerts (asset_id);
CREATE INDEX idx_alerts_agent_id       ON alerts (agent_id);
CREATE INDEX idx_alerts_assigned_to    ON alerts (assigned_to);
CREATE INDEX idx_alerts_fired_at       ON alerts (fired_at DESC);
CREATE INDEX idx_alerts_risk_score     ON alerts (risk_score DESC);
CREATE INDEX idx_alerts_tags           ON alerts USING GIN (tags);
CREATE INDEX idx_alerts_title_trgm     ON alerts USING GIN (title gin_trgm_ops);

CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- alert_mitre_mapping
-- ---------------------------------------------------------------------------
CREATE TABLE alert_mitre_mapping (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id        UUID        NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
    technique_id    UUID        NOT NULL REFERENCES mitre_techniques (id) ON DELETE CASCADE,
    confidence      SMALLINT    NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
    mapped_by       UUID        REFERENCES users (id) ON DELETE SET NULL,
    auto_mapped     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_alert_mitre_mapping UNIQUE (alert_id, technique_id)
);

CREATE INDEX idx_alert_mitre_alert_id     ON alert_mitre_mapping (alert_id);
CREATE INDEX idx_alert_mitre_technique_id ON alert_mitre_mapping (technique_id);

-- =============================================================================
-- INCIDENTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- incidents
-- ---------------------------------------------------------------------------
CREATE TABLE incidents (
    id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number     SERIAL           UNIQUE NOT NULL,    -- human-readable #1001
    title               VARCHAR(512)     NOT NULL,
    description         TEXT,
    severity            severity_level   NOT NULL DEFAULT 'medium',
    status              incident_status  NOT NULL DEFAULT 'open',
    priority            SMALLINT         NOT NULL DEFAULT 2  -- 1=P1 … 5=P5
                        CHECK (priority BETWEEN 1 AND 5),
    lead_analyst        UUID             REFERENCES users (id) ON DELETE SET NULL,
    created_by          UUID             REFERENCES users (id) ON DELETE SET NULL,
    assigned_team       TEXT,
    sla_due_at          TIMESTAMPTZ,
    contained_at        TIMESTAMPTZ,
    eradicated_at       TIMESTAMPTZ,
    recovered_at        TIMESTAMPTZ,
    closed_at           TIMESTAMPTZ,
    root_cause          TEXT,
    executive_summary   TEXT,
    lessons_learned     TEXT,
    tags                TEXT[]           NOT NULL DEFAULT '{}',
    metadata            JSONB            NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_severity    ON incidents (severity);
CREATE INDEX idx_incidents_status      ON incidents (status);
CREATE INDEX idx_incidents_lead_analyst ON incidents (lead_analyst);
CREATE INDEX idx_incidents_created_by  ON incidents (created_by);
CREATE INDEX idx_incidents_created_at  ON incidents (created_at DESC);
CREATE INDEX idx_incidents_sla_due_at  ON incidents (sla_due_at);
CREATE INDEX idx_incidents_tags        ON incidents USING GIN (tags);

CREATE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Alerts ↔ Incidents (many-to-many)
CREATE TABLE incident_alerts (
    incident_id UUID NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    alert_id    UUID NOT NULL REFERENCES alerts    (id) ON DELETE CASCADE,
    linked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    linked_by   UUID        REFERENCES users (id)  ON DELETE SET NULL,
    PRIMARY KEY (incident_id, alert_id)
);

CREATE INDEX idx_incident_alerts_alert_id ON incident_alerts (alert_id);

-- ---------------------------------------------------------------------------
-- incident_comments
-- ---------------------------------------------------------------------------
CREATE TABLE incident_comments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID        NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    author_id       UUID        NOT NULL REFERENCES users (id)     ON DELETE CASCADE,
    parent_id       UUID        REFERENCES incident_comments (id)  ON DELETE SET NULL,
    body            TEXT        NOT NULL,
    is_internal     BOOLEAN     NOT NULL DEFAULT TRUE,   -- FALSE = visible in report
    is_edited       BOOLEAN     NOT NULL DEFAULT FALSE,
    edited_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_comments_incident_id ON incident_comments (incident_id);
CREATE INDEX idx_incident_comments_author_id   ON incident_comments (author_id);
CREATE INDEX idx_incident_comments_parent_id   ON incident_comments (parent_id);
CREATE INDEX idx_incident_comments_created_at  ON incident_comments (created_at DESC);

CREATE TRIGGER trg_incident_comments_updated_at
    BEFORE UPDATE ON incident_comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RISK
-- =============================================================================

-- ---------------------------------------------------------------------------
-- risk_scores
-- ---------------------------------------------------------------------------
CREATE TABLE risk_scores (
    id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     risk_entity_type  NOT NULL,
    entity_id       UUID              NOT NULL,
    score           NUMERIC(5, 2)     NOT NULL CHECK (score BETWEEN 0 AND 100),
    score_prev      NUMERIC(5, 2)     CHECK (score_prev BETWEEN 0 AND 100),
    delta           NUMERIC(6, 2)     GENERATED ALWAYS AS (score - COALESCE(score_prev, score)) STORED,
    factors         JSONB             NOT NULL DEFAULT '{}',  -- JSON breakdown of score contributors
    model_version   VARCHAR(32)       NOT NULL DEFAULT '1.0',
    computed_by     VARCHAR(64)       NOT NULL DEFAULT 'system',
    computed_at     TIMESTAMPTZ       NOT NULL DEFAULT now(),
    valid_until     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_scores_entity         ON risk_scores (entity_type, entity_id);
CREATE INDEX idx_risk_scores_score          ON risk_scores (score DESC);
CREATE INDEX idx_risk_scores_computed_at    ON risk_scores (computed_at DESC);
CREATE INDEX idx_risk_scores_entity_time    ON risk_scores (entity_type, entity_id, computed_at DESC);

-- =============================================================================
-- EVIDENCE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- evidence
-- ---------------------------------------------------------------------------
CREATE TABLE evidence (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID            REFERENCES incidents (id) ON DELETE CASCADE,
    alert_id        UUID            REFERENCES alerts    (id) ON DELETE SET NULL,
    uploaded_by     UUID            REFERENCES users     (id) ON DELETE SET NULL,
    evidence_type   evidence_type   NOT NULL DEFAULT 'other',
    filename        VARCHAR(512),
    file_size       BIGINT,
    mime_type       VARCHAR(128),
    sha256_hash     CHAR(64),
    storage_path    TEXT,
    description     TEXT,
    chain_of_custody JSONB          NOT NULL DEFAULT '[]',   -- array of custody events
    is_sensitive    BOOLEAN         NOT NULL DEFAULT FALSE,
    collected_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_incident_id   ON evidence (incident_id);
CREATE INDEX idx_evidence_alert_id      ON evidence (alert_id);
CREATE INDEX idx_evidence_uploaded_by   ON evidence (uploaded_by);
CREATE INDEX idx_evidence_type          ON evidence (evidence_type);
CREATE INDEX idx_evidence_sha256        ON evidence (sha256_hash);
CREATE INDEX idx_evidence_collected_at  ON evidence (collected_at DESC);

CREATE TRIGGER trg_evidence_updated_at
    BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- REPORTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
CREATE TABLE reports (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(256)   NOT NULL,
    report_type     report_type    NOT NULL DEFAULT 'custom',
    status          report_status  NOT NULL DEFAULT 'draft',
    generated_by    UUID           REFERENCES users (id) ON DELETE SET NULL,
    incident_id     UUID           REFERENCES incidents (id) ON DELETE SET NULL,
    date_range_start TIMESTAMPTZ,
    date_range_end  TIMESTAMPTZ,
    parameters      JSONB          NOT NULL DEFAULT '{}',
    content         JSONB          NOT NULL DEFAULT '{}',  -- rendered report content
    storage_path    TEXT,                                  -- PDF / DOCX path
    file_size       BIGINT,
    is_public       BOOLEAN        NOT NULL DEFAULT FALSE,
    generated_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_report_type   ON reports (report_type);
CREATE INDEX idx_reports_status        ON reports (status);
CREATE INDEX idx_reports_generated_by  ON reports (generated_by);
CREATE INDEX idx_reports_incident_id   ON reports (incident_id);
CREATE INDEX idx_reports_created_at    ON reports (created_at DESC);

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- THREAT INTELLIGENCE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- threat_intelligence  (feed / campaign records)
-- ---------------------------------------------------------------------------
CREATE TABLE threat_intelligence (
    id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(256)          NOT NULL,
    description     TEXT,
    source          threat_intel_source   NOT NULL DEFAULT 'osint',
    source_name     VARCHAR(128),
    source_url      TEXT,
    threat_actor    VARCHAR(128),
    campaign        VARCHAR(128),
    severity        severity_level        NOT NULL DEFAULT 'medium',
    confidence      ioc_confidence        NOT NULL DEFAULT 'medium',
    tlp_level       VARCHAR(16)           NOT NULL DEFAULT 'amber'  -- TLP: white/green/amber/red
                    CHECK (tlp_level IN ('white','green','amber','red')),
    tags            TEXT[]                NOT NULL DEFAULT '{}',
    raw_data        JSONB                 NOT NULL DEFAULT '{}',
    valid_from      TIMESTAMPTZ           NOT NULL DEFAULT now(),
    valid_until     TIMESTAMPTZ,
    created_by      UUID                  REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE INDEX idx_threat_intel_source        ON threat_intelligence (source);
CREATE INDEX idx_threat_intel_severity      ON threat_intelligence (severity);
CREATE INDEX idx_threat_intel_threat_actor  ON threat_intelligence (threat_actor);
CREATE INDEX idx_threat_intel_valid_from    ON threat_intelligence (valid_from DESC);
CREATE INDEX idx_threat_intel_tags          ON threat_intelligence USING GIN (tags);

CREATE TRIGGER trg_threat_intel_updated_at
    BEFORE UPDATE ON threat_intelligence
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- ioc_indicators
-- ---------------------------------------------------------------------------
CREATE TABLE ioc_indicators (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_intel_id     UUID            REFERENCES threat_intelligence (id) ON DELETE CASCADE,
    ioc_type            ioc_type        NOT NULL,
    value               TEXT            NOT NULL,
    confidence          ioc_confidence  NOT NULL DEFAULT 'medium',
    severity            severity_level  NOT NULL DEFAULT 'medium',
    description         TEXT,
    context             JSONB           NOT NULL DEFAULT '{}',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    first_seen_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
    hit_count           INTEGER         NOT NULL DEFAULT 0,
    false_positive_flag BOOLEAN         NOT NULL DEFAULT FALSE,
    valid_until         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT uq_ioc_type_value UNIQUE (ioc_type, value)
);

CREATE INDEX idx_ioc_type               ON ioc_indicators (ioc_type);
CREATE INDEX idx_ioc_value              ON ioc_indicators (value);
CREATE INDEX idx_ioc_threat_intel_id    ON ioc_indicators (threat_intel_id);
CREATE INDEX idx_ioc_confidence         ON ioc_indicators (confidence);
CREATE INDEX idx_ioc_severity           ON ioc_indicators (severity);
CREATE INDEX idx_ioc_is_active          ON ioc_indicators (is_active);
CREATE INDEX idx_ioc_last_seen_at       ON ioc_indicators (last_seen_at DESC);
CREATE INDEX idx_ioc_value_trgm         ON ioc_indicators USING GIN (value gin_trgm_ops);

CREATE TRIGGER trg_ioc_indicators_updated_at
    BEFORE UPDATE ON ioc_indicators
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- IOC ↔ Alert cross-reference
CREATE TABLE ioc_alert_matches (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ioc_id          UUID        NOT NULL REFERENCES ioc_indicators (id) ON DELETE CASCADE,
    alert_id        UUID        NOT NULL REFERENCES alerts          (id) ON DELETE CASCADE,
    matched_field   VARCHAR(64),          -- field in alert that contained the IOC
    matched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ioc_alert_match UNIQUE (ioc_id, alert_id)
);

CREATE INDEX idx_ioc_alert_matches_alert_id ON ioc_alert_matches (alert_id);
CREATE INDEX idx_ioc_alert_matches_ioc_id   ON ioc_alert_matches (ioc_id);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID          REFERENCES users (id) ON DELETE SET NULL,
    actor_email     VARCHAR(255),                        -- denormalised for immutability
    action          audit_action  NOT NULL,
    resource_type   VARCHAR(64)   NOT NULL,              -- table / entity name
    resource_id     UUID,
    resource_before JSONB,                               -- snapshot before change
    resource_after  JSONB,                               -- snapshot after change
    ip_address      INET,
    user_agent      TEXT,
    request_id      UUID,
    session_id      UUID,
    status_code     SMALLINT,
    error_message   TEXT,
    metadata        JSONB         NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
    -- audit_logs are immutable — no updated_at, no UPDATE trigger
);

CREATE INDEX idx_audit_logs_actor_id      ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_action        ON audit_logs (action);
CREATE INDEX idx_audit_logs_resource      ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at    ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_ip_address    ON audit_logs (ip_address);
CREATE INDEX idx_audit_logs_request_id    ON audit_logs (request_id);

-- Prevent UPDATE and DELETE on audit_logs
CREATE OR REPLACE RULE audit_logs_no_update AS
    ON UPDATE TO audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_logs_no_delete AS
    ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- =============================================================================
-- SEED: built-in roles
-- =============================================================================
INSERT INTO roles (name, description, is_system_role) VALUES
    ('superadmin',   'Full platform access',                         TRUE),
    ('soc_manager',  'Manage team, reports, and configuration',      TRUE),
    ('analyst_l1',   'Triage alerts and create incidents',           TRUE),
    ('analyst_l2',   'Investigate incidents and run playbooks',      TRUE),
    ('analyst_l3',   'Advanced threat hunting and forensics',        TRUE),
    ('read_only',    'View-only access to dashboards and reports',   TRUE),
    ('api_service',  'Machine-to-machine service account role',      TRUE);

-- =============================================================================
-- SEED: core permissions
-- =============================================================================
INSERT INTO permissions (resource, action, description) VALUES
    ('alerts',              'read',         'View alerts'),
    ('alerts',              'write',        'Create and update alerts'),
    ('alerts',              'delete',       'Delete alerts'),
    ('alerts',              'acknowledge',  'Acknowledge alerts'),
    ('incidents',           'read',         'View incidents'),
    ('incidents',           'write',        'Create and update incidents'),
    ('incidents',           'delete',       'Delete incidents'),
    ('incidents',           'escalate',     'Escalate incidents'),
    ('assets',              'read',         'View assets'),
    ('assets',              'write',        'Create and update assets'),
    ('assets',              'delete',       'Delete assets'),
    ('users',               'read',         'View users'),
    ('users',               'write',        'Create and update users'),
    ('users',               'delete',       'Delete users'),
    ('reports',             'read',         'View reports'),
    ('reports',             'write',        'Generate reports'),
    ('reports',             'export',       'Export reports'),
    ('threat_intelligence', 'read',         'View threat intelligence'),
    ('threat_intelligence', 'write',        'Manage threat intelligence'),
    ('audit_logs',          'read',         'View audit logs'),
    ('playbooks',           'execute',      'Execute automated playbooks'),
    ('risk_scores',         'read',         'View risk scores'),
    ('risk_scores',         'write',        'Override risk scores'),
    ('mitre',               'read',         'View MITRE techniques'),
    ('mitre',               'write',        'Manage MITRE mappings');

-- ---------------------------------------------------------------------------
-- ai_analysis
-- ---------------------------------------------------------------------------
CREATE TABLE ai_analysis (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id        UUID        NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
    incident_id     UUID        REFERENCES incidents (id) ON DELETE SET NULL,
    provider        VARCHAR(32) NOT NULL,
    model           VARCHAR(64) NOT NULL,
    executive_summary TEXT      NOT NULL,
    technical_analysis TEXT     NOT NULL,
    mitre_explanation TEXT      NOT NULL,
    mitre_mappings  JSONB       NOT NULL DEFAULT '[]',
    risk_explanation TEXT       NOT NULL,
    recommended_actions TEXT[]  NOT NULL DEFAULT '{}',
    investigation_steps TEXT[]  NOT NULL DEFAULT '{}',
    raw_prompt      TEXT,
    raw_response    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE users               IS 'SOCVision platform users — analysts, managers, and service accounts';
COMMENT ON TABLE roles               IS 'RBAC roles assigned to users';
COMMENT ON TABLE permissions         IS 'Fine-grained resource·action permission atoms';
COMMENT ON TABLE user_roles          IS 'Many-to-many mapping of users to roles';
COMMENT ON TABLE role_permissions    IS 'Many-to-many mapping of roles to permissions';
COMMENT ON TABLE assets              IS 'Monitored assets — endpoints, servers, cloud instances, etc.';
COMMENT ON TABLE asset_groups        IS 'Hierarchical grouping of assets (site / org / team)';
COMMENT ON TABLE agents              IS 'Wazuh / EDR agents deployed on assets';
COMMENT ON TABLE alerts              IS 'Normalised detection alerts from Splunk, Wazuh, and third-party sources';
COMMENT ON TABLE alert_mitre_mapping IS 'MITRE ATT&CK technique tags applied to alerts';
COMMENT ON TABLE mitre_techniques    IS 'MITRE ATT&CK Enterprise technique catalogue';
COMMENT ON TABLE incidents           IS 'Security incidents — collections of correlated alerts';
COMMENT ON TABLE incident_alerts     IS 'Alerts linked to incidents';
COMMENT ON TABLE incident_comments   IS 'Analyst comments and timeline entries on incidents';
COMMENT ON TABLE risk_scores         IS 'Time-series risk scores for assets, users, alerts, and incidents';
COMMENT ON TABLE evidence            IS 'Digital evidence files attached to incidents or alerts';
COMMENT ON TABLE reports             IS 'Generated PDF/DOCX reports (executive summaries, forensics, etc.)';
COMMENT ON TABLE threat_intelligence IS 'Threat intel feeds — campaigns, actors, and bulletins';
COMMENT ON TABLE ioc_indicators      IS 'Indicators of Compromise extracted from threat intel';
COMMENT ON TABLE ioc_alert_matches   IS 'Cross-reference table for IOCs matched in alerts';
COMMENT ON TABLE audit_logs          IS 'Immutable append-only audit trail for all platform actions';
