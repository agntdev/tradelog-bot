import { describe, expect, it } from "vitest";
import { createTrade, csv, saveTrade, setClockForTests, summaryFor } from "../src/trade-journal.js";

describe("trade journal calculations", () => {
  it("calculates total P&L and win rate from saved trades", () => {
    setClockForTests(() => new Date("2026-07-27T12:00:00.000Z"));
    const ctx = { session: {} } as never;
    createTrade(ctx, { ticker: "AAPL", trade_type: "Long", size: 1, price: 100, entry_datetime: "2026-07-27", pnl: 20 });
    createTrade(ctx, { ticker: "MSFT", trade_type: "Short", size: 1, price: 200, entry_datetime: "2026-07-27", pnl: -5 });
    expect(summaryFor(ctx, "2026-07-27", "2026-07-27")).toMatchObject({ total_pnl: 15, trade_count: 2, win_rate: 50 });
    setClockForTests();
  });

  it("quotes CSV values correctly", () => {
    expect(csv([{ id: "1", ticker: "AAPL", trade_type: "Long", size: 1, price: 100, entry_datetime: "2026-07-27", pnl: 5, notes: "said \"wait\"", created_at: "2026-07-27T00:00:00.000Z", version: 1 }])).toContain('"said ""wait"""');
  });

  it("rejects a stale edit version", () => {
    const ctx = { session: {} } as never;
    const trade = createTrade(ctx, { ticker: "AAPL", trade_type: "Long", size: 1, price: 100, entry_datetime: "2026-07-27" });
    expect(saveTrade(ctx, trade.id, { ticker: "AAPL", trade_type: "Long", size: 2, price: 100, entry_datetime: "2026-07-27" }, 99)).toBeUndefined();
  });
});
