-- Soft-delete for user accounts. Hard-deleting a user who had ever sent a
-- chat message crashed on the messages.sender_id foreign key. Soft-delete
-- also preserves message history/attribution for other org members when
-- someone leaves — their name keeps showing on their old messages instead
-- of the conversation breaking or losing context.
-- Nullable, defaults to NULL (active). NULL = active account.

ALTER TABLE users ADD COLUMN deleted_at DATETIME;
