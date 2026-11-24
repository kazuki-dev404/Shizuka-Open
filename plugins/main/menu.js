// plugins/main/menu.js — Menu Utama (SHIZUKA - MD) ✨
"use strict";

const os = require("os");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

let prepareWAMessageMedia;
try {
  prepareWAMessageMedia = require("@fuxxy-star/baileys").prepareWAMessageMedia;
} catch {}

function toMonoUpperBold(t) {
  const mp = {A:"𝗔",B:"𝗕",C:"𝗖",D:"𝗗",E:"𝗘",F:"𝗙",G:"𝗚",H:"𝗛",I:"𝗜",J:"𝗝",K:"𝗞",L:"𝗟",M:"𝗠",N:"𝗡",O:"𝗢",P:"𝗣",Q:"𝗤",R:"𝗥",S:"𝗦",T:"𝗧",U:"𝗨",V:"𝗩",W:"𝗪",X:"𝗫",Y:"𝗬",Z:"𝗭",0:"𝟬",1:"𝟭",2:"𝟮",3:"𝟯",4:"𝟰",5:"𝟱",6:"𝟲",7:"𝟳",8:"𝟴",9:"𝟵"," ":" "};
  return t.toUpperCase().split("").map(c => mp[c] || c).join("");
}

function getGreeting() {
  const h = parseInt(new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", hour: "numeric", hour12: false
  }));
  if (h >= 0  && h < 5)  return "good night, sleepyhead 🌙";
  if (h >= 5  && h < 11) return "good morning, sunshine ☀️";
  if (h >= 11 && h < 15) return "good afternoon~ 🔆";
  if (h >= 15 && h < 18) return "good evening, love 🌤️";
  return "good night, sweet dreams 🌙";
}

function fmtUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        mn = Math.floor((s % 3600) / 60), sc = Math.floor(s % 60);
  return d ? `${d}d ${h}h ${mn}m` : h ? `${h}h ${mn}m ${sc}s` : `${mn}m ${sc}s`;
}

const CAT_EMOJI = {
  main: "🏠", owner: "👑", group: "👥", download: "📥", tools: "🛠️", ai: "🤖",
  user: "👤", game: "🎮", fun: "🎉", search: "🔍", sticker: "✨", religi: "🕌",
  info: "📋", convert: "🔄", store: "🛒", pterodactyl: "🖥️", random: "🎲",
  rpg: "⚔️", maker: "🎨",
};
const CAT_LABEL = {
  main: "Main Menu", owner: "Owner", group: "Groups", download: "Downloaders",
  tools: "Tools", ai: "AI Assistant", user: "User", game: "Games",
  fun: "Fun & Play", search: "Search", sticker: "Stickers", religi: "Religious",
  info: "Info", convert: "Converters", store: "Store", pterodactyl: "Pterodactyl",
  random: "Random", rpg: "RPG", maker: "Makers",
};
const CAT_ORDER = ["main","owner","group","fun","game","rpg","maker","download","tools","ai","search","sticker","religi","info","user","convert","store","pterodactyl","random"];

function scanAllPlugins() {
  const toArr = v => !v ? [] : (Array.isArray(v) ? v : [v]);
  let categories = {};
  if (global.plugins) {
    for (const file in global.plugins) {
      const plug = global.plugins[file];
      if (!plug) continue;
      const tags = toArr(plug.tags);
      const cmds = plug.help ? toArr(plug.help) : toArr(plug.command);
      if (!tags.length && cmds.length) {
        let defaultTag = "tools";
        if (file.includes("owner")) defaultTag = "owner";
        else if (file.includes("group")) defaultTag = "group";
        else if (file.includes("ai")) defaultTag = "ai";
        else if (file.includes("download")) defaultTag = "download";
        else if (file.includes("fun")) defaultTag = "fun";
        else if (file.includes("game")) defaultTag = "game";
        else if (file.includes("rpg")) defaultTag = "rpg";
        else if (file.includes("maker")) defaultTag = "maker";
        else if (file.includes("tools")) defaultTag = "tools";
        tags.push(defaultTag);
      }
      if (!tags.length || !cmds.length) continue;
      for (const rawTag of tags) {
        const key = String(rawTag).toLowerCase();
        if (!categories[key]) categories[key] = { cat: key, emoji: CAT_EMOJI[key] || "📌", cmds: [], plugins: [] };
        cmds.forEach(c => {
          const cmd = c.toString().split(" ")[0];
          if (cmd && !categories[key].cmds.includes(cmd)) {
            categories[key].cmds.push(cmd);
            categories[key].plugins.push(file);
          }
        });
      }
    }
  }
  try {
    const pluginsDir = path.join(process.cwd(), "plugins");
    if (fs.existsSync(pluginsDir)) scanPluginFolder(pluginsDir, categories);
  } catch (e) {}
  return categories;
}

function scanPluginFolder(dir, categories) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) { scanPluginFolder(filePath, categories); continue; }
    if (!file.endsWith(".js") || file.includes("menu")) continue;
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      let cmds = [], tags = [], help = [];
      const cmdMatch = content.match(/handler\.command\s*=\s*\[([^\]]+)\]/);
      if (cmdMatch) cmds = cmdMatch[1].split(",").map(c => c.trim().replace(/['"]/g, ""));
      const tagsMatch = content.match(/handler\.tags\s*=\s*\[([^\]]+)\]/);
      if (tagsMatch) tags = tagsMatch[1].split(",").map(c => c.trim().replace(/['"]/g, ""));
      const helpMatch = content.match(/handler\.help\s*=\s*\[([^\]]+)\]/);
      if (helpMatch) help = helpMatch[1].split(",").map(c => c.trim().replace(/['"]/g, ""));
      const finalCmds = help.length > 0 ? help : cmds;
      if (!tags.length && finalCmds.length) {
        let defaultTag = "tools";
        const folderName = path.basename(path.dirname(filePath));
        if (["owner","group","ai","download","fun","game","rpg","maker","tools"].includes(folderName)) defaultTag = folderName;
        tags.push(defaultTag);
      }
      if (tags.length && finalCmds.length) {
        for (const rawTag of tags) {
          const key = String(rawTag).toLowerCase();
          if (!categories[key]) categories[key] = { cat: key, emoji: CAT_EMOJI[key] || "📌", cmds: [], plugins: [] };
          finalCmds.forEach(c => {
            const cmd = c.toString().split(" ")[0];
            if (cmd && !categories[key].cmds.includes(cmd)) {
              categories[key].cmds.push(cmd);
              categories[key].plugins.push(file);
            }
          });
        }
      }
    } catch {}
  }
}

function sortCategories(categories) {
  return [
    ...CAT_ORDER.filter(k => categories[k]).map(k => categories[k]),
    ...Object.keys(categories).filter(k => !CAT_ORDER.includes(k)).sort().map(k => categories[k]),
  ];
}

async function getThumbBuffer() {
  try {
    const r = await axios.get(global.thumbnail, { responseType: "arraybuffer", timeout: 8000 });
    return Buffer.from(r.data);
  } catch { return null; }
}

function buildContextInfo(m) {
  return {
    isForwarded: true, forwardingScore: 9,
    participant: "0@s.whatsapp.net",
    quotedMessage: { conversation: `${global.botname}` },
    mentionedJid: [`${m.sender}`],
    forwardedNewsletterMessageInfo: {
      newsletterJid: global.idChannel || "120363427915199733@newsletter",
      newsletterName: global.botname,
      serverMessageId: 127,
    },
  };
}

async function sendInteractive(sock, m, { bodyText, footer, nativeFlow, thumbBuf }) {
  const contextInfo = buildContextInfo(m);
  let sent = false;
  if (thumbBuf && prepareWAMessageMedia) {
    try {
      const media = await prepareWAMessageMedia({ image: thumbBuf }, { upload: sock.waUploadToServer });
      await sock.relayMessage(m.chat, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: { title: "", subtitle: "", hasMediaAttachment: true, imageMessage: media.imageMessage },
              body: { text: bodyText },
              footer: { text: footer },
              contextInfo,
              nativeFlowMessage: nativeFlow,
            },
          },
        },
      }, {});
      sent = true;
    } catch (e) {}
  }
  if (!sent) {
    try {
      await sock.relayMessage(m.chat, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: { title: "", subtitle: "", hasMediaAttachment: false },
              body: { text: bodyText },
              footer: { text: footer },
              contextInfo,
              nativeFlowMessage: nativeFlow,
            },
          },
        },
      }, {});
      sent = true;
    } catch (e) {}
  }
  return sent;
}

let handler = async (m, { sock, command }) => {
  const categories = scanAllPlugins();
  const sorted = sortCategories(categories);

  if (command && command.startsWith("cat_")) {
    return renderCategoryDetail(m, sock, command.replace("cat_", ""), sorted);
  }

  const rows = sorted.map(({ cat, emoji, cmds }) => ({
    title: `${emoji} ${toMonoUpperBold(CAT_LABEL[cat] || cat)}`,
    description: `${cmds.length} little commands inside ♡`,
    id: `${global.prefix}cat_${cat}`,
  }));

  const totalCmd  = sorted.reduce((a, c) => a + c.cmds.length, 0);
  const uptime    = fmtUptime(process.uptime());
  const totalMem  = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const usedMem   = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0);
  const user      = global.db?.users?.[m.sender] || {};
  const isPrem    = m.isPremium;
  const greeting  = getGreeting();
  const energiMax = isPrem ? (global.energiPremium || 500) : (global.energiDefault || 50);

  const bodyText = `
╭════════════════════╮
┃   ${toMonoUpperBold(global.botname || "SHIZUKA - MD")}
┃   ${greeting}, ${m.pushName || "sweetie"} ♡
╰════════════════════╯

┌─「 ⚡ *bot info* 」
│ ✦ name     : *${global.botname || "SHIZUKA - MD"}*
│ ✦ version  : *v${global.versibot || "1.0.0"}*
│ ✦ dev      : *${global.ownername || "@Kazuki.dev"}*
│ ✦ prefix   : *${global.prefix}*
│ ✦ mode     : *${sock.public ? "public 🌍" : "self 🌙"}*
│ ✦ uptime   : *${uptime}*
│ ✦ ram      : *${usedMem} MB / ${totalMem} GB*
│ ✦ categories: *${sorted.length}*
│ ✦ total cmds: *${totalCmd}*
└─────────────────

┌─「 👤 *about you* 」
│ ✦ name   : *${m.pushName || "-"}*
│ ✦ role   : *${m.isOwner ? "👑 owner" : isPrem ? "💎 premium" : "🌸 user"}*
│ ✦ energy : *${user.energi ?? energiMax}/${energiMax}*
│ ✦ coins  : *${user.koin || 0}*
│ ✦ xp     : *${user.exp || 0}*
│ ✦ status : *${user.registered ? "✅ registered" : "⚠️ not registered yet"}*
└─────────────────

📂 tap the button below to peek at all my little menus ♡`;

  // 🔒 TAG CARD - JANGAN DIHAPUS! 🔒
  // HANYA BUTTON KATEGORI! (2 button dihapus)
  const nativeFlow = {
    messageParamsJson: JSON.stringify({
      limited_time_offer: {
        text: greeting,
        url: "https://wa.me/" + (global.owner || "0"),
        copy_code: "made with love by " + (global.ownername || "@Kazuki.dev"),
        expiration_time: Date.now() + 86400000,
      },
      bottom_sheet: {
        in_thread_buttons_limit: 1,
        divider_indices: [1, 999],
        list_title: "pick a category, okay? ♡",
        button_title: "📋 see all menus",
      },
    }),
    buttons: [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "🌟 see all menus",
          sections: [{ title: "choose a category ♡", rows }],
        }),
      },
    ],
  };

  const thumbBuf = await getThumbBuffer();
  const sent = await sendInteractive(sock, m, {
    bodyText,
    footer: "⚡ SHIZUKA - MD — cozy menu ♡",
    nativeFlow,
    thumbBuf,
  });

  if (!sent) {
    const fallback =
      `╭─☰ ${toMonoUpperBold(global.botname)}\n` +
      `> mode   : ${sock.public ? "public 🌍" : "self 🌙"}\n` +
      `> uptime : ${uptime}\n` +
      `> ram    : ${usedMem} MB\n` +
      `> prefix : ${global.prefix}\n` +
      `> role   : ${m.isOwner ? "👑 owner" : isPrem ? "💎 premium" : "🌸 user"}\n` +
      `╰─⬣\n\n` +
      sorted.map(({ cat, cmds }) => `${global.prefix}cat_${cat} — ${CAT_LABEL[cat] || cat} (${cmds.length})`).join("\n");
    // 🖼️ image always shown, even when interactive buttons fail
    if (thumbBuf) await sock.sendMessage(m.chat, { image: thumbBuf, caption: fallback }, { quoted: m.verifiedQuoted });
    else await sock.sendMessage(m.chat, { text: fallback }, { quoted: m.verifiedQuoted });
  }
};

async function renderCategoryDetail(m, sock, catKey, sorted) {
  const found = sorted.find(c => c.cat === catKey);
  if (!found) return sock.sendMessage(m.chat, { text: `⚠️ *gomen ne...* i couldn't find the *"${catKey}"* category~\ntry typing *${global.prefix}menu* again ♡` }, { quoted: m.verifiedQuoted });

  const label = CAT_LABEL[catKey] || catKey;
  const emoji = CAT_EMOJI[catKey] || "📌";
  const cmdList = [...found.cmds].sort();

  const bodyText =
`${emoji} *${toMonoUpperBold(label)}*
there are *${cmdList.length}* little commands in here ♡

${cmdList.map(c => `▸ ${global.prefix}${c}`).join("\n")}

💡 type *${global.prefix}menu* to come back~`;

  const rows = sorted.map(({ cat, emoji: e, cmds }) => ({
    title: `${e} ${toMonoUpperBold(CAT_LABEL[cat] || cat)}`,
    description: `${cmds.length} little commands ♡`,
    id: `${global.prefix}cat_${cat}`,
  }));

  const nativeFlow = {
    messageParamsJson: JSON.stringify({
      bottom_sheet: { in_thread_buttons_limit: 1, divider_indices: [1, 999], list_title: "switch category~", button_title: "📋 other categories" },
    }),
    buttons: [{ name: "single_select", buttonParamsJson: JSON.stringify({ title: "🌟 other categories", sections: [{ title: "pick one ♡", rows }] }) }],
  };

  const thumbBuf = await getThumbBuffer();
  const sent = await sendInteractive(sock, m, { bodyText, footer: `category: ${label} ♡`, nativeFlow, thumbBuf });
  if (!sent) {
    // 🖼️ image fallback for category detail too
    if (thumbBuf) await sock.sendMessage(m.chat, { image: thumbBuf, caption: bodyText }, { quoted: m.verifiedQuoted });
    else await sock.sendMessage(m.chat, { text: bodyText }, { quoted: m.verifiedQuoted });
  }
}

handler.command = ["menu", "help", "?", "m", /^cat_/i];
handler.tags = ["main"];
handler.help = ["menu"];
module.exports = handler;
