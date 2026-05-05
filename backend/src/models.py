from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str | None] = mapped_column(Text, unique=True)
    full_name: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("app_users.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    legal_name: Mapped[str | None] = mapped_column(Text)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    company_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    financial_year_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    tx_date: Mapped[str] = mapped_column(Date, nullable=False)
    voucher_no: Mapped[str | None] = mapped_column(Text)
    challan_no: Mapped[str | None] = mapped_column(Text)
    site_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True))
    item_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="MT")
    purchase_rate: Mapped[float | None] = mapped_column(Numeric(12, 2))
    sale_rate: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    trip_count: Mapped[int] = mapped_column(nullable=False, default=1)
    notes: Mapped[str | None] = mapped_column(Text)
    invoice_status: Mapped[str] = mapped_column(String(20), nullable=False, default="not_invoiced")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
