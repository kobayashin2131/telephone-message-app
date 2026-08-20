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
    memo_target_type: m.target_type,
    memo_target_name: m.target_name,
    thread_count: 0
  };
}
