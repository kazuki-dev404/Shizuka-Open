// plugins/ping.js — SHIZUKA - MD ✨
const { performance } = require("perf_hooks");
const os = require("os");

let handler = async (m, { sock }) => {
  const start = performance.now();
  const msg = await sock.sendMessage(m.chat, {
    text: "⏳ *pinging... hold on a sec~* ♡",
  }, { quoted: m });
  const end = performance.now();
  const latency = (end - start).toFixed(2);

  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const usedMem = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0);

  await sock.sendMessage(m.chat, {
    text:
`╭━━━━◈ 🏓 𝗽𝗼𝗻𝗴~ ◈━━━━╮
┃  ⌬ latency › *${latency} ms*
┃  ⌬ status  › *online & cozy ✅*
┃  ⌬ uptime  › *${global.runtime(process.uptime())}*
┃  ⌬ ram     › *${usedMem} MB*
┃  ⌬ bot     › *${global.botname}*
╰━━━━━━━━━━━━━━━━━━━━━⬣

ehehe~ still here for you ♡`,
    edit: msg.key,
  });

  await m.react("✅");
};

handler.command = ["ping", "speed", "p"];
handler.tags = ["main"];
handler.help = ["ping"];
module.exports = handler;
