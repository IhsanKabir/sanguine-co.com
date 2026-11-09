-- Guest preorders: a product preorder no longer requires an account.
-- The request carries the contact email (the quote is sent there and the
-- customer replies to accept); customer_id stays set for signed-in
-- customers, and the account page already matches requests by email too.
-- Apply BEFORE deploying the code that inserts guest rows.

alter table preorder_requests alter column customer_id drop not null;
