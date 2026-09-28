-- Fictional hosted identities use separate IDs to preserve existing Access users.
INSERT OR IGNORE INTO banks VALUES ('bank-demo', 'Northstar Demo Bank');
INSERT OR IGNORE INTO organizations VALUES ('org-northstar', 'bank-demo', 'Northstar Demo Ltd'), ('org-cedar', 'bank-demo', 'Cedar Demo Ltd');
INSERT OR IGNORE INTO users(id, issuer, subject, display_name) VALUES
 ('demo-client-northstar','urn:dch:local','demo-client-northstar','Northstar client'),
 ('demo-client-cedar','urn:dch:local','demo-client-cedar','Cedar client'),
 ('demo-manager','urn:dch:local','demo-manager','Alex Morgan'),
 ('demo-compliance','urn:dch:local','demo-compliance','Jamie Taylor'),
 ('demo-admin','urn:dch:local','demo-admin','Demo administrator');
INSERT OR IGNORE INTO memberships VALUES
 ('demo-client-northstar','bank-demo','client','org-northstar'),
 ('demo-client-cedar','bank-demo','client','org-cedar'),
 ('demo-manager','bank-demo','manager',NULL),
 ('demo-compliance','bank-demo','compliance',NULL),
 ('demo-admin','bank-demo','demo-admin',NULL);
INSERT OR IGNORE INTO staff_assignments VALUES
 ('demo-manager','bank-demo','org-northstar'), ('demo-compliance','bank-demo','org-northstar');
