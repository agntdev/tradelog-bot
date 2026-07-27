import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem } from "../toolkit/index.js";
import { backKeyboard, isoDay, now, summaryFor, summaryText } from "../trade-journal.js";
registerMainMenuItem({ label: "This week", data: "summary:week", order: 40 });
const composer = new Composer<Ctx>();
function text(ctx: Ctx) { const end = isoDay(); const startDate = new Date(now().valueOf() - 6 * 86_400_000); return summaryText("This week’s summary", summaryFor(ctx, isoDay(startDate), end)); }
composer.command("week", async (ctx) => { await ctx.reply(text(ctx), { reply_markup: backKeyboard() }); });
composer.command("summary", async (ctx) => { await ctx.reply(text(ctx), { reply_markup: backKeyboard() }); });
composer.callbackQuery("summary:week", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText(text(ctx), { reply_markup: backKeyboard() }); });
export default composer;
