const fs = require("fs");

// ═══════════════════════════════════════════
//  SHIZUKA - MD — Config ✨
// ═══════════════════════════════════════════

// ── INFO BOT ──────────────────────────────
global.owner = process.env.OWNER_NUMBER || "94740152669";
global.pairingNumber = process.env.PAIRING_NUMBER || "94740152669";

global.botname = "SHIZUKA - MD";
global.versibot = "1.0.0";
global.ownername = "@Kazuki.dev";
global.owner = "94740152669";
global.pairingNumber = "94740152669";

// ── LINKS ─────────────────────────────────
global.linkChannel = "https://whatsapp.com/channel/0029VbCgjWUFXUuRf0RRCW1h";
global.idChannel = "120363427915199733@newsletter";
global.linkGrup = "https://chat.whatsapp.com/HK56HeTkb9O0XalmSIi5Ne?s=cl&p=a&ilr=1";
global.thumbnail = "https://files.catbox.moe/06n0yd.jpg";

// ── PREFIX & MODE ─────────────────────────
global.prefix = ".";
global.mode = "public";

// ── STICKER ───────────────────────────────
global.packname = "SHIZUKA - MD";
global.author = "@Kazuki.dev";

// ── API KEYS ──────────────────────────────
global.groqApiKey = "";
global.geminiApiKey = "";
global.cukiApiKey = "";

// ── GROUP PROTECTION ──────────────────────
global.pesan = {
  antilink: "🌸 *no linkies please~* — @%user% dropped a link, so i gently deleted it for you ♡",
  antilinkKick: "🌸 *no linkies please~* — @%user% sent a link, so i had to remove them... gomen ne ♡",
  antitagsw: "🌙 *no tagging status silly~* — @%user% tagged a status, so i quietly hid it away ♡",
  antitoxic: "🌷 @%user% used some unkind words... warning %warn% / %max%, please be nice ♡",
  antidocument: "📎 *no documents please~* — @%user% sent one, so i softly deleted it ♡",
  antisticker: "🎀 *no stickers please~* — @%user% sent one, so i tucked it away ♡",
  antimedia: "🌿 *no media please~* — @%user% sent a file, so i gently removed it ♡",
};

// ── AUTOMATION ────────────────────────────
global.autoTyping = true;
global.antiCall = false;
global.blockIfCall = false;

// ── WELCOME / GOODBYE ─────────────────────
global.welcomeDefault = false;
global.goodbyeDefault = false;

// ── SCHEDULER ─────────────────────────────
global.resetHour = 0;
global.resetMinute = 0;

// ── HOT RELOAD ────────────────────────────
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  delete require.cache[file];
  require(file);
});
