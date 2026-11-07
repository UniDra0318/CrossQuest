-- ============================================================================
-- CrossQuest Production Database Setup: pgAudit & RDS Logging Configuration
-- Requirement: OI-20, SEC-12, SEC-13, Chapter III Section 3.7 & Table 13
-- ============================================================================

-- 1. Enable pgAudit extension (requires RDS parameter shared_preload_libraries = 'pgaudit')
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- 2. Configure pgAudit logging parameters
-- Captures READ, WRITE, DDL, and ROLE modifications at the PostgreSQL engine level
ALTER SYSTEM SET pgaudit.log = 'read, write, ddl, role';
ALTER SYSTEM SET pgaudit.log_catalog = 'off';
ALTER SYSTEM SET pgaudit.log_relation = 'on';
ALTER SYSTEM SET pgaudit.log_parameter = 'on';

-- 3. Configure Amazon RDS PostgreSQL Logging Parameters
-- Logs connections, disconnections, durations, and structured log prefix
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_duration = 'on';
ALTER SYSTEM SET log_min_duration_statement = '500'; -- Log queries exceeding 500ms
ALTER SYSTEM SET log_statement = 'ddl'; -- Audit all schema/table definitions
ALTER SYSTEM SET log_line_prefix = '%m [%p]: user=%u,db=%d,app=%a,client=%h ';

-- 4. Dedicated restricted maintenance role for 12-month retention enforcement
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'crossquest_audit_retention_role') THEN
        CREATE ROLE crossquest_audit_retention_role WITH LOGIN NOINHERIT;
    END IF;
END
$$;

-- Grant minimal permissions strictly required to execute the retention job
GRANT SELECT, DELETE ON TABLE access_logs TO crossquest_audit_retention_role;
GRANT SELECT, DELETE ON TABLE anomaly_alerts TO crossquest_audit_retention_role;

-- Reload PostgreSQL configuration
SELECT pg_reload_conf();
