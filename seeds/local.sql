INSERT OR IGNORE INTO banks VALUES ('bank-demo', 'Northstar Demo Bank');
INSERT OR IGNORE INTO organizations VALUES ('org-northstar', 'bank-demo', 'Northstar Demo Ltd'), ('org-cedar', 'bank-demo', 'Cedar Demo Ltd');
INSERT OR IGNORE INTO users(id, issuer, subject, display_name) VALUES
 ('client-northstar','urn:dch:local','client-northstar','Northstar client'),
 ('client-cedar','urn:dch:local','client-cedar','Cedar client'),
 ('manager','urn:dch:local','manager','Alex Morgan'),
 ('compliance','urn:dch:local','compliance','Jamie Taylor'),
 ('admin','urn:dch:local','admin','Demo administrator');
INSERT OR IGNORE INTO memberships VALUES
 ('client-northstar','bank-demo','client','org-northstar'),
 ('client-cedar','bank-demo','client','org-cedar'),
 ('manager','bank-demo','manager',NULL),
 ('compliance','bank-demo','compliance',NULL),
 ('admin','bank-demo','demo-admin',NULL);
INSERT OR IGNORE INTO staff_assignments VALUES
 ('manager','bank-demo','org-northstar'), ('compliance','bank-demo','org-northstar'),
 ('manager','bank-demo','org-cedar'), ('compliance','bank-demo','org-cedar');
