import { Composer, InputFile } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem } from "../toolkit/index.js";
import { activeTrades, csv, forceReply, parseDate } from "../trade-journal.js";
registerMainMenuItem({ label: "Export CSV", data: "trades:export", order: 60 });
const composer = new Composer<Ctx>();
async function begin(ctx: Ctx, edit = false) { ctx.session.step = "export:start"; const text = "Send the export start date as YYYY-MM-DD."; if (edit) await ctx.editMessageText(text); else await ctx.reply(text, { reply_markup: forceReply("Start date") }); }
composer.command("export", (ctx) => begin(ctx));
composer.callbackQuery("trades:export", async (ctx) => { await ctx.answerCallbackQuery(); await begin(ctx, true); });
composer.on("message:text", async (ctx, next) => { const step = ctx.session.step; if (step !== "export:start" && step !== "export:end") return next(); const date = parseDate(ctx.message.text.trim()); if (!date) return void await ctx.reply("That date isn’t valid. Use YYYY-MM-DD."); if (step === "export:start") { ctx.session.exportStart = date; ctx.session.step = "export:end"; await ctx.reply("Send the export end date as YYYY-MM-DD.", { reply_markup: forceReply("End date") }); return; } const start = ctx.session.exportStart; if (!start || date < start) return void await ctx.reply("The end date must be on or after the start date."); const trades = activeTrades(ctx).filter((trade) => trade.entry_datetime >= start && trade.entry_datetime <= date); ctx.session.step = undefined; ctx.session.exportStart = undefined; const file = new InputFile(new TextEncoder().encode(csv(trades)), `trades-${start}-to-${date}.csv`); await ctx.replyWithDocument(file, { caption: `Export ready: ${trades.length} trade${trades.length === 1 ? "" : "s"}.` }); });
export default composer;
