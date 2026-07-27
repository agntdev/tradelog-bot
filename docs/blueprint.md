# Trade Journal Bot — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot for tracking trading activity with customizable fields, daily/weekly summaries, basic analytics (win rate, P&L), and searchable history. Supports quick-add shorthand, edit/delete workflows, and CSV exports.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- single-user private trader

## Success criteria

- User can record and review trades with confirmation messages
- Daily/weekly summaries delivered on schedule
- Searchable trade history returns accurate results
- CSV exports contain correctly formatted data

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with quick-access buttons
- **/new** (command, actor: user, command: /new) — Open guided trade entry form
  - inputs: ticker, trade type, size, price, entry date
  - outputs: trade confirmation message
- **/list** (command, actor: user, command: /list) — Show recent trades with edit/delete options
  - inputs: date range filter
  - outputs: trade list with action buttons
- **/today** (command, actor: user, command: /today) — Show today's trade summary
  - outputs: summary with P&L and win rate
- **/week** (command, actor: user, command: /week) — Show weekly trade summary
  - outputs: summary with P&L and win rate
- **/search** (command, actor: user, command: /search) — Search trades by ticker or date
  - inputs: search term
  - outputs: matching trade entries
- **/export** (command, actor: user, command: /export) — Export trades to CSV
  - inputs: start date, end date
  - outputs: CSV file attachment

## Flows

### Add Trade
_Trigger:_ /new or Add button

1. Display guided form with pre-filled fields where possible
2. Validate required fields
3. Show confirmation with trade details
4. Save entry to persistent storage

_Data touched:_ TradeEntry

### Quick Add
_Trigger:_ Text message matching trade pattern

1. Parse shorthand format
2. Display parsed values for confirmation
3. Save confirmed entry

_Data touched:_ TradeEntry

### Edit Trade
_Trigger:_ Edit button from /list

1. Load existing trade data
2. Display editable form
3. Save changes with versioning

_Data touched:_ TradeEntry

### Generate Summary
_Trigger:_ /today, /week, or scheduled

1. Aggregate trades by date range
2. Calculate totals and win rate
3. Format summary message

_Data touched:_ TradeEntry, Summary

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **TradeEntry** _(retention: persistent)_ — Individual trade record with owner-defined fields
  - fields: ticker, trade_type, size, price, entry_datetime, exit_datetime, pnl, notes, id, created_at
- **Summary** _(retention: persistent)_ — Aggregated trade statistics
  - fields: date_range, total_pnl, trade_count, win_rate

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /start
- /new
- /list
- /today
- /week
- /summary
- /search
- /export

## Notifications

- Daily/weekly summary messages
- Trade confirmation alerts
- Export completion notifications

## Permissions & privacy

- All data is private to the owner
- No third-party data sharing
- Edit/delete access restricted to owner

## Edge cases

- Invalid date formats in quick-add
- Missing required fields during entry
- Conflicting trade edits
- Overlapping date ranges in exports

## Required tests

- End-to-end trade entry flow with confirmation
- Summary generation accuracy test
- CSV export format validation
- Edit/delete workflow integrity check

## Assumptions

- Owner is sole user with full data access
- All trade fields are owner-defined with no auto-calculation beyond P&L
- Notifications are delivered directly to owner's private chat
