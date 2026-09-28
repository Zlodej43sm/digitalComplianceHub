-- Copy to hosted.local.sql, then replace every __PLACEHOLDER__ with verified
-- Access identity information. Never use email addresses as identity subjects.
-- Escape embedded SQL single quotes by doubling them. Run only on the selected
-- synthetic dev/demo database after applying migrations.
INSERT OR IGNORE INTO banks VALUES ('bank-demo', 'Northstar Demo Bank');
INSERT OR IGNORE INTO organizations VALUES ('org-northstar', 'bank-demo', 'Northstar Demo Ltd'), ('org-cedar', 'bank-demo', 'Cedar Demo Ltd');
INSERT INTO users(id, issuer, subject, display_name) VALUES
 ('client-northstar','__ACCESS_ISSUER__','__NORTHSTAR_SUBJECT__','Northstar client'),
 ('client-cedar','__ACCESS_ISSUER__','__CEDAR_SUBJECT__','Cedar client'),
 ('manager','__ACCESS_ISSUER__','__MANAGER_SUBJECT__','Alex Morgan'),
 ('compliance','__ACCESS_ISSUER__','__COMPLIANCE_SUBJECT__','Jamie Taylor'),
 ('admin','__ACCESS_ISSUER__','__ADMIN_SUBJECT__','Demo administrator');
INSERT INTO memberships VALUES
 ('client-northstar','bank-demo','client','org-northstar'),
 ('client-cedar','bank-demo','client','org-cedar'),
 ('manager','bank-demo','manager',NULL),
 ('compliance','bank-demo','compliance',NULL),
 ('admin','bank-demo','demo-admin',NULL);
INSERT INTO staff_assignments VALUES
 ('manager','bank-demo','org-northstar'), ('compliance','bank-demo','org-northstar');
