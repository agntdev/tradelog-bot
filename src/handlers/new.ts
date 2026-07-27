import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { confirmKeyboard, inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { createTrade, forceReply, formatTrade, isoDay, parseDate, saveTrade, type TradeType } from "../trade-journal.js";

registerMainMenuItem({ label: "Add trade", data: "trade:new", order: 10 });
const composer = new Composer<Ctx>();
type Draft = { ticker: string; trade_type: TradeType; size: number; price: number; entry_datetime: string; pnl?: number; notes?: string; version?: number };
const clear = (ctx: Ctx) => { ctx.session.step = undefined; ctx.session.draft = undefined; ctx.session.editingId = undefined; };
const begin = async (ctx: Ctx, editingId?: string) => {
  clear(ctx); ctx.session.editingId = editingId; ctx.session.step = "trade:ticker";
  await ctx.reply(editingId ? "Send the updated ticker." : "Send the ticker, for example AAPL.", { reply_markup: forceReply("Ticker") });
};
composer.command("new", (ctx) => begin(ctx));
composer.callbackQuery("trade:new", async (ctx) => { await ctx.answerCallbackQuery(); await begin(ctx); });
composer.callbackQuery(/^trade:edit:(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); await begin(ctx, ctx.match[1]); });
composer.callbackQuery(/^trade:type:(Long|Short)$/, async (ctx) => { await ctx.answerCallbackQuery(); const d = ctx.session.draft as Draft | undefined; if (!d) return; d.trade_type = ctx.match[1] as TradeType; ctx.session.step = "trade:size"; await ctx.reply("Send the position size.", { reply_markup: forceReply("Size") }); });
composer.callbackQuery("trade:date:today", async (ctx) => { await ctx.answerCallbackQuery(); const d = ctx.session.draft as Draft | undefined; if (!d) return; d.entry_datetime = isoDay(); ctx.session.step = "trade:pnl"; await ctx.editMessageText("Send realized P&L, or tap Skip.", { reply_markup: inlineKeyboard([[inlineButton("Skip", "trade:pnl:skip")]]) }); });
composer.callbackQuery("trade:pnl:skip", async (ctx) => { await ctx.answerCallbackQuery(); const d = ctx.session.draft as Draft | undefined; if (!d) return; ctx.session.step = "trade:notes"; await ctx.editMessageText("Add a note, or tap Skip.", { reply_markup: inlineKeyboard([[inlineButton("Skip", "trade:notes:skip")]]) }); });
composer.callbackQuery("trade:notes:skip", async (ctx) => { await ctx.answerCallbackQuery(); await confirm(ctx); });
async function persist(ctx: Ctx) { const d = ctx.session.draft as Draft | undefined; if (!d) return; const fields = { ...d }; delete fields.version; const trade = ctx.session.editingId ? saveTrade(ctx, ctx.session.editingId, fields, d.version ?? 0) : createTrade(ctx, fields); if (!trade) { clear(ctx); await ctx.editMessageText("That trade changed before your edit was saved. Open it again from Recent trades."); return; } clear(ctx); await ctx.editMessageText(`Trade saved.\n\n${formatTrade(trade)}`); }
composer.callbackQuery("trade:save", async (ctx) => { await ctx.answerCallbackQuery(); await persist(ctx); });
composer.callbackQuery("trade:cancel", async (ctx) => { await ctx.answerCallbackQuery(); clear(ctx); await ctx.editMessageText("Trade entry cancelled."); });
async function confirm(ctx: Ctx) { const d = ctx.session.draft as Draft | undefined; if (!d) return; ctx.session.step = "trade:confirm"; await ctx.reply(`Confirm this trade:\n\n${formatTrade({ ...d, id: "", created_at: "", version: 0 })}`, { reply_markup: confirmKeyboard("trade", { yes: "Save trade", no: "Cancel" }) }); }
composer.callbackQuery("trade:yes", async (ctx) => { await ctx.answerCallbackQuery(); await persist(ctx); });
composer.callbackQuery("trade:no", async (ctx) => { await ctx.answerCallbackQuery(); clear(ctx); await ctx.editMessageText("Trade entry cancelled."); });
composer.on("message:text", async (ctx, next) => {
  const text = ctx.message.text.trim(); if (text.startsWith("/")) return next();
  if (!ctx.session.step) { const m = /^([A-Za-z.]{1,12})\s+(long|short)\s+(\d+(?:\.\d+)?)\s+@\s*(\d+(?:\.\d+)?)(?:\s+(\d{4}-\d{2}-\d{2}))?(?:\s+pnl\s+(-?\d+(?:\.\d+)?))?$/i.exec(text); if (!m) return next(); const entry = m[5] ? parseDate(m[5]) : isoDay(); if (!entry) { await ctx.reply("That date isn’t valid. Use YYYY-MM-DD."); return; } ctx.session.draft = { ticker: m[1].toUpperCase(), trade_type: m[2][0].toUpperCase() + m[2].slice(1).toLowerCase() as TradeType, size: Number(m[3]), price: Number(m[4]), entry_datetime: entry, ...(m[6] ? { pnl: Number(m[6]) } : {}) }; return confirm(ctx); }
  const d = (ctx.session.draft ??= {}) as Partial<Draft>;
  if (ctx.session.step === "trade:ticker") { if (!/^[A-Za-z.]{1,12}$/.test(text)) return void await ctx.reply("Use a ticker of up to 12 letters, then try again."); d.ticker = text.toUpperCase(); if (ctx.session.editingId) { const old = ctx.session.journal?.trades[ctx.session.editingId]; if (old) Object.assign(d, { trade_type: old.trade_type, size: old.size, price: old.price, entry_datetime: old.entry_datetime, pnl: old.pnl, notes: old.notes, version: old.version }); } ctx.session.step = "trade:type"; await ctx.reply("Choose the trade type.", { reply_markup: inlineKeyboard([[inlineButton("Long", "trade:type:Long"), inlineButton("Short", "trade:type:Short")]]) }); return; }
  if (ctx.session.step === "trade:size" || ctx.session.step === "trade:price") { const value = Number(text); if (!Number.isFinite(value) || value <= 0) return void await ctx.reply("Send a positive number."); if (ctx.session.step === "trade:size") { d.size = value; ctx.session.step = "trade:price"; await ctx.reply("Send the entry price.", { reply_markup: forceReply("Price") }); } else { d.price = value; ctx.session.step = "trade:date"; await ctx.reply("Send the entry date as YYYY-MM-DD, or tap Today.", { reply_markup: inlineKeyboard([[inlineButton("Today", "trade:date:today")]]) }); } return; }
  if (ctx.session.step === "trade:date") { const date = parseDate(text); if (!date) return void await ctx.reply("That date isn’t valid. Use YYYY-MM-DD."); d.entry_datetime = date; ctx.session.step = "trade:pnl"; await ctx.reply("Send realized P&L, or tap Skip.", { reply_markup: inlineKeyboard([[inlineButton("Skip", "trade:pnl:skip")]]) }); return; }
  if (ctx.session.step === "trade:pnl") { const value = Number(text); if (!Number.isFinite(value)) return void await ctx.reply("Send P&L as a number, or tap Skip."); d.pnl = value; ctx.session.step = "trade:notes"; await ctx.reply("Add a note, or tap Skip.", { reply_markup: inlineKeyboard([[inlineButton("Skip", "trade:notes:skip")]]) }); return; }
  if (ctx.session.step === "trade:notes") { d.notes = text.slice(0, 500); await confirm(ctx); }
});
export default composer;
