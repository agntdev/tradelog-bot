import type { Ctx } from "./bot.js";
import { inlineButton, inlineKeyboard } from "./toolkit/index.js";

export type TradeType = "Long" | "Short";
export interface Trade {
  id: string;
  ticker: string;
  trade_type: TradeType;
  size: number;
  price: number;
  entry_datetime: string;
  exit_datetime?: string;
  pnl?: number;
  notes?: string;
  created_at: string;
  version: number;
}
export interface Summary { date_range: string; total_pnl: number; trade_count: number; win_rate: number; }
export interface Journal { nextId: number; tradeIds: string[]; trades: Record<string, Trade>; summaries: Record<string, Summary>; }

let clock: () => Date = () => new Date();
export function now(): Date { return clock(); }
export function setClockForTests(value?: () => Date): void { clock = value ?? (() => new Date()); }

export function journal(ctx: Ctx): Journal {
  return (ctx.session.journal ??= { nextId: 1, tradeIds: [], trades: {}, summaries: {} });
}
export function activeTrades(ctx: Ctx): Trade[] {
  const j = journal(ctx);
  return j.tradeIds.map((id) => j.trades[id]).filter((trade): trade is Trade => Boolean(trade));
}
export function createTrade(ctx: Ctx, fields: Omit<Trade, "id" | "created_at" | "version">): Trade {
  const j = journal(ctx);
  const id = String(j.nextId++);
  const trade: Trade = { ...fields, id, created_at: now().toISOString(), version: 1 };
  j.trades[id] = trade;
  j.tradeIds.unshift(id);
  return trade;
}
export function saveTrade(ctx: Ctx, id: string, fields: Omit<Trade, "id" | "created_at" | "version">, expectedVersion: number): Trade | undefined {
  const old = journal(ctx).trades[id];
  if (!old || old.version !== expectedVersion) return undefined;
  const trade: Trade = { ...fields, id, created_at: old.created_at, version: old.version + 1 };
  journal(ctx).trades[id] = trade;
  return trade;
}
export function deleteTrade(ctx: Ctx, id: string): Trade | undefined {
  const j = journal(ctx); const trade = j.trades[id];
  if (!trade) return undefined;
  delete j.trades[id]; j.tradeIds = j.tradeIds.filter((tradeId) => tradeId !== id);
  return trade;
}
export function isoDay(date = now()): string { return date.toISOString().slice(0, 10); }
export function parseDate(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}
export function formatMoney(value?: number): string { return value === undefined ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}`; }
export function formatTrade(trade: Trade): string {
  return `${trade.ticker} · ${trade.trade_type}\nSize ${trade.size} at ${trade.price}\nEntry ${trade.entry_datetime}\nP&L ${formatMoney(trade.pnl)}`;
}
export function summaryFor(ctx: Ctx, start: string, end: string): Summary {
  const trades = activeTrades(ctx).filter((trade) => trade.entry_datetime >= start && trade.entry_datetime <= end);
  const resolved = trades.filter((trade) => trade.pnl !== undefined);
  const total_pnl = resolved.reduce((total, trade) => total + (trade.pnl ?? 0), 0);
  const win_rate = resolved.length === 0 ? 0 : (resolved.filter((trade) => (trade.pnl ?? 0) > 0).length / resolved.length) * 100;
  const result = { date_range: `${start} to ${end}`, total_pnl, trade_count: trades.length, win_rate };
  journal(ctx).summaries[result.date_range] = result;
  return result;
}
export function summaryText(label: string, summary: Summary): string {
  return `${label}\nTrades: ${summary.trade_count}\nP&L: ${formatMoney(summary.total_pnl)}\nWin rate: ${summary.win_rate.toFixed(1)}%`;
}
export function backKeyboard() { return inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]); }
export function forceReply(placeholder: string) { return { force_reply: true as const, input_field_placeholder: placeholder }; }
export function csv(trades: Trade[]): string {
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return ["id,ticker,trade_type,size,price,entry_datetime,exit_datetime,pnl,notes,created_at", ...trades.map((t) => [t.id, t.ticker, t.trade_type, t.size, t.price, t.entry_datetime, t.exit_datetime, t.pnl, t.notes, t.created_at].map(quote).join(","))].join("\n");
}
