# QA-only checkout marker

This private device-test candidate targets the isolated QA database and always inserts new marketplace checkout orders with test_order=true. It does not accept a client-supplied test flag. The column is already present in migration 001; verify the actual QA database before deployment. Historical rows are not rewritten, reclassified or considered verified live transactions. Commission accrual remains disabled by migration 008; no payment or collection changes are made. Do not promote this staging-only behavior to production without explicit release review.
