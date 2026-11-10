CREATE OR REPLACE FUNCTION anomaly_alert_peer_review_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Closed anomaly alerts are immutable (OI-30)';
  END IF;
  IF NEW.reviewed_by_user_id IS NOT NULL AND NEW.reviewed_by_user_id = NEW.subject_user_id THEN
    RAISE EXCEPTION 'An administrator cannot review an alert that concerns them (OI-30)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_anomaly_alert_peer_review_guard ON anomaly_alerts;
CREATE TRIGGER trg_anomaly_alert_peer_review_guard
  BEFORE UPDATE ON anomaly_alerts
  FOR EACH ROW EXECUTE FUNCTION anomaly_alert_peer_review_guard();

