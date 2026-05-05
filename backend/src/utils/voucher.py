import uuid


def resolve_voucher_no(transaction_id: uuid.UUID, explicit: str | None) -> str:
    """
    Human-facing voucher code tied to the transaction primary key.
    If the client sends a non-empty voucher_no, it is kept; otherwise one is generated.
    """
    if explicit is not None:
        s = str(explicit).strip()
        if s:
            return s
    return f"VCH-{transaction_id.hex[:14].upper()}"
