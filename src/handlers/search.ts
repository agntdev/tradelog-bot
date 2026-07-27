import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { activeTrades, formatTrade, forceReply, parseDate } from "../trade-journal.js";
registerMainMenuItem({ label: "Search", data: "trades:search", order: 50 });
const composer = new Composer<Ctx>();
async function prompt(ctx: Ctx, edit = false) { ctx.session.step = "search"; const text = "Send a ticker or a date in YYYY-MM-DD."; if (edit) await ctx.editMessageText(text); else await ctx.reply(text, { reply_markup: forceReply("Ticker or date") }); }
composer.command("search", (ctx) => prompt(ctx));
composer.callbackQuery("trades:search", async (ctx) => { await ctx.answerCallbackQuery(); await prompt(ctx, true); });
composer.on("message:text", async (ctx, next) => { if (ctx.session.step !== "search") return next(); const term = ctx.message.text.trim(); const day = parseDate(term); const matches = activeTrades(ctx).filter((trade) => day ? trade.entry_datetime === day : trade.ticker.toLowerCase() === term.toLowerCase()); ctx.session.step = undefined; if (!matches.length) return void await ctx.reply("No matching trades found. Try a ticker or date you recorded.", { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) }); await ctx.reply(`Matching trades\n\n${matches.map(formatTrade).join("\n\n")}`, { reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]) }); });
export default composer;
