// Adapts a raw call_memos row (from GET /api/call-memos) into the
// memo_* shaped prop that <CallMemoCard> expects — the same shape
// GET /api/messages already returns for call_card messages via SQL aliases.
export function adaptCallMemo(m) {
  return {
    id: m.id,
    memo_id: m.id,
    memo_company: m.company_name,
    memo_contact: m.contact_person,
    memo_phone: m.phone_number,
    memo_subject: m.subject,
    memo_body: m.body,
    memo_type: m.call_type,
    memo_status: m.status,
    memo_resolved_note: m.resolved_note,
    memo_resolved_at: m.resolved_at,
    memo_resolver_name: m.resolver_name,
    thread_count: 0
  };
}
