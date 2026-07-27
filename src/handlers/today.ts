import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem } from "../toolkit/index.js";
import { backKeyboard, isoDay, summaryFor, summaryText } from "../trade-journal.js";
registerMainMenuItem({ label: "Today", data: "summary:today", order: 30 });
const composer = new Composer<Ctx>();
function text(ctx: Ctx) { const day = isoDay(); return summaryText("Today’s summary", summaryFor(ctx, day, day)); }
composer.command("today", async (ctx) => { await ctx.reply(text(ctx), { reply_markup: backKeyboard() }); });
composer.callbackQuery("summary:today", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText(text(ctx), { reply_markup: backKeyboard() }); });
export default composer;
