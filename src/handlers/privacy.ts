import { Composer } from "grammy";
import type { Ctx } from "../bot.js";

// The journal is intentionally single-owner and private. Stop group traffic
// before any feature handler can read or write the owner's stored journal.
const composer = new Composer<Ctx>();

composer.on("message", async (ctx, next) => {
  if (ctx.chat.type === "private") return next();
  await ctx.reply("This trade journal is available only in a private chat.");
});

composer.callbackQuery(/.*/, async (ctx, next) => {
  if (ctx.chat?.type === "private") return next();
  await ctx.answerCallbackQuery({ text: "Open this bot in a private chat." });
});

export default composer;
