import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { activeTrades, backKeyboard, deleteTrade, formatTrade, parseDate } from "../trade-journal.js";

registerMainMenuItem({ label: "Recent trades", data: "trades:list", order: 20 });
const composer = new Composer<Ctx>();
async function show(ctx: Ctx, edit = false, range?: [string, string]) {
  const trades = activeTrades(ctx).filter((trade) => !range || (trade.entry_datetime >= range[0] && trade.entry_datetime <= range[1])).slice(0, 10);
  const text = trades.length ? `Recent trades\n\n${trades.map(formatTrade).join("\n\n")}` : "No trades yet — tap Add trade to record one.";
  const rows = trades.flatMap((trade) => [[inlineButton(`Edit ${trade.ticker}`, `trade:edit:${trade.id}`), inlineButton("Delete", `trade:delete:${trade.id}`)]]);
  rows.push([inlineButton("Filter dates", "trades:filter"), inlineButton("Back to menu", "menu:main")]);
  const options = { reply_markup: inlineKeyboard(rows) };
  if (edit) await ctx.editMessageText(text, options); else await ctx.reply(text, options);
}
composer.command("list", (ctx) => show(ctx));
composer.callbackQuery("trades:list", async (ctx) => { await ctx.answerCallbackQuery(); await show(ctx, true); });
composer.callbackQuery("trades:filter", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.step = "list:range"; await ctx.editMessageText("Send a date range as YYYY-MM-DD to YYYY-MM-DD."); });
composer.callbackQuery(/^trade:delete:(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const trade = ctx.session.journal?.trades[ctx.match[1]]; if (!trade) return void await ctx.editMessageText("That trade is no longer available.", { reply_markup: backKeyboard() }); await ctx.editMessageText(`Delete ${trade.ticker}?`, { reply_markup: inlineKeyboard([[inlineButton("Delete trade", `trade:delete:confirm:${trade.id}`), inlineButton("Keep trade", "trades:list")]]) }); });
composer.callbackQuery(/^trade:delete:confirm:(\d+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const removed = deleteTrade(ctx, ctx.match[1]); await ctx.editMessageText(removed ? "Trade deleted." : "That trade is no longer available.", { reply_markup: backKeyboard() }); });
composer.on("message:text", async (ctx, next) => { if (ctx.session.step !== "list:range") return next(); const match = /^(\d{4}-\d{2}-\d{2})\s+(?:to|–|-)\s+(\d{4}-\d{2}-\d{2})$/.exec(ctx.message.text.trim()); if (!match || !parseDate(match[1]) || !parseDate(match[2]) || match[1] > match[2]) return void await ctx.reply("Send a valid range, for example 2026-07-01 to 2026-07-31."); ctx.session.step = undefined; await show(ctx, false, [match[1], match[2]]); });
export default composer;
