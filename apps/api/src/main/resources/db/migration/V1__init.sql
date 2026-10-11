-- PayTrail: schema inicial. Fonte: specs/01-dominio.md
-- Valores USDC em numeric(20,6); BRL em numeric(20,2).

create table users (
    id              uuid primary key default gen_random_uuid(),
    email           text not null unique,
    password_hash   text not null,
    role            text not null check (role in ('FREELANCER', 'ACCOUNTANT')),
    name            text not null,
    city            text,
    bio             text,
    specialties     text[] not null default '{}',
    solana_wallet   text,
    arc_wallet      text,
    fx_rule         text not null default 'CARNE_LEAO' check (fx_rule in ('CARNE_LEAO', 'PTAX_DAY')),
    created_at      timestamptz not null default now()
);

create table invoices (
    id                uuid primary key default gen_random_uuid(),
    public_id         text not null unique,
    freelancer_id     uuid not null references users (id),
    client_name       text not null,
    client_email      text,
    description       text not null,
    network           text not null check (network in ('SOLANA', 'ARC')),
    recipient_address text not null,
    base_amount       numeric(20, 6) not null check (base_amount > 0),
    unique_amount     numeric(20, 6) not null check (unique_amount >= base_amount),
    reference         text unique,
    due_date          date not null,
    amount_paid       numeric(20, 6) not null default 0,
    status            text not null default 'OPEN'
                      check (status in ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERPAID', 'CANCELLED')),
    created_at        timestamptz not null default now(),
    cancelled_at      timestamptz
);
create index invoices_recipient_idx on invoices (network, recipient_address, status);
create index invoices_freelancer_idx on invoices (freelancer_id, created_at desc);

create table payments (
    id               uuid primary key default gen_random_uuid(),
    network          text not null check (network in ('SOLANA', 'ARC')),
    tx_hash          text not null,
    log_index        int not null default 0,
    from_address     text not null,
    to_address       text not null,
    amount           numeric(20, 6) not null check (amount > 0),
    block_time       timestamptz not null,
    freelancer_id    uuid not null references users (id),
    invoice_id       uuid references invoices (id),
    match_method     text check (match_method in ('REFERENCE', 'CONTRACT_EVENT', 'UNIQUE_AMOUNT', 'MANUAL')),
    status           text not null default 'DETECTED'
                     check (status in ('DETECTED', 'MATCHED', 'UNMATCHED', 'AMBIGUOUS')),
    unmatched_reason text,
    fx_rule          text check (fx_rule in ('CARNE_LEAO', 'PTAX_DAY')),
    fx_date          date,
    fx_rate          numeric(12, 6),
    amount_brl       numeric(20, 2),
    created_at       timestamptz not null default now(),
    unique (network, tx_hash, log_index)
);
create index payments_freelancer_idx on payments (freelancer_id, status, block_time);
create index payments_invoice_idx on payments (invoice_id);

create table invoice_events (
    id          uuid primary key default gen_random_uuid(),
    invoice_id  uuid not null references invoices (id),
    type        text not null,
    payload     jsonb not null default '{}',
    created_at  timestamptz not null default now()
);
create index invoice_events_invoice_idx on invoice_events (invoice_id, created_at);

create table receipts (
    id              uuid primary key default gen_random_uuid(),
    invoice_id      uuid not null references invoices (id),
    canonical_json  text not null,
    sha256          text not null unique,
    anchor_network  text,
    anchor_tx       text,
    created_at      timestamptz not null default now()
);

-- Cotação do dólar (BCB). As regras de câmbio só escolhem QUAL data usar.
create table exchange_rates (
    quote_date  date primary key,
    buy_rate    numeric(12, 6) not null,
    sell_rate   numeric(12, 6) not null,
    source      text not null default 'BCB_PTAX',
    fetched_at  timestamptz not null default now()
);

-- ---------- Marketplace / inbox ----------

create table conversations (
    id               uuid primary key default gen_random_uuid(),
    user_a_id        uuid not null references users (id),
    user_b_id        uuid not null references users (id),
    created_at       timestamptz not null default now(),
    last_message_at  timestamptz not null default now(),
    check (user_a_id < user_b_id),
    unique (user_a_id, user_b_id)
);

create table proposals (
    id               uuid primary key default gen_random_uuid(),
    conversation_id  uuid not null references conversations (id),
    sender_id        uuid not null references users (id),
    recipient_id     uuid not null references users (id),
    accountant_id    uuid not null references users (id),
    freelancer_id    uuid not null references users (id),
    fee_amount       numeric(20, 6) not null check (fee_amount >= 0),
    fee_currency     text not null check (fee_currency in ('BRL', 'USDC')),
    period_start     date not null,
    period_end       date not null,
    note             text,
    status           text not null default 'SENT'
                     check (status in ('SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    created_at       timestamptz not null default now(),
    decided_at       timestamptz,
    check (period_start <= period_end)
);
-- no máximo uma proposta SENT por conversa
create unique index proposals_one_open_idx on proposals (conversation_id) where status = 'SENT';

create table messages (
    id               uuid primary key default gen_random_uuid(),
    conversation_id  uuid not null references conversations (id),
    sender_id        uuid references users (id),
    type             text not null check (type in ('TEXT', 'PROPOSAL', 'SYSTEM')),
    body             text not null check (length(body) <= 4000),
    proposal_id      uuid references proposals (id),
    created_at       timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table accountant_access (
    id             uuid primary key default gen_random_uuid(),
    accountant_id  uuid not null references users (id),
    freelancer_id  uuid not null references users (id),
    proposal_id    uuid not null references proposals (id),
    period_start   date not null,
    period_end     date not null,
    status         text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
    granted_at     timestamptz not null default now(),
    revoked_at     timestamptz
);
-- no máximo um acesso ACTIVE por par contador/freelancer
create unique index accountant_access_one_active_idx
    on accountant_access (accountant_id, freelancer_id) where status = 'ACTIVE';

create table access_logs (
    id             uuid primary key default gen_random_uuid(),
    accountant_id  uuid not null references users (id),
    freelancer_id  uuid not null references users (id),
    action         text not null check (action in ('VIEW_REPORT', 'EXPORT_CSV', 'VIEW_INVOICE')),
    created_at     timestamptz not null default now()
);
create index access_logs_pair_idx on access_logs (freelancer_id, accountant_id, created_at desc);
