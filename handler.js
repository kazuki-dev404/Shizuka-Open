// handler.js — SHIZUKA - MD ✨
const fs = require("fs");
const util = require("util");
const chalk = require("chalk");

module.exports = async (sock, m) => {
  try {
    let plugins = global.plugins;

    const prefix = m.prefix;
    const isCmd = m?.body?.startsWith(prefix);
    const args = isCmd ? m.body.trim().split(/ +/).slice(1) : [];
    const text = args.join(" ");
    const q = text;
    const command = isCmd
      ? m.body.slice(prefix.length).trim().split(" ").shift().toLowerCase()
      : "";
    const cmd = prefix + command;
    const quoted = m.quoted ? m.quoted : m;
    const mime = quoted?.msg?.mimetype || quoted?.mimetype || null;
    const qmsg = m.quoted || m;
    const botNumber = m.botNumber;
    const isOwner = m.isOwner;

    m.cmd = cmd;
    m.mime = mime;
    m.qmsg = qmsg;
    m.args = args;
    m.text = text;
    m.isGroup = m.chat.endsWith("g.us");
    m.metadata = {};
    m.isAdmin = false;
    m.isBotAdmin = false;
    m.example = (teks, cmds = cmd) => m.reply(`*here's an example~* ♡\n${cmds} ${teks}`);

    // ── reaction helper ────────────
    m.react = async (emoji) => {
      await sock.sendMessage(m.chat, {
        react: { text: emoji, key: m.key },
      }).catch(() => {});
    };

    // ── premium / banned user check ──
    const settings = global.settings || {};
    const senderClean = (m.sender || "").split("@")[0];
    m.isPremium =
      isOwner ||
      (settings.premium || []).some((p) => {
        const c = typeof p === "string" ? p : p.id;
        return (c || "").split("@")[0] === senderClean;
      }) ||
      (settings.partner || []).some((p) => {
        const c = typeof p === "string" ? p : p.id;
        return (c || "").split("@")[0] === senderClean;
      });

    m.isBanned = (settings.banned || []).some(
      (b) => (b || "").split("@")[0] === senderClean
    );

    if (m.isBanned) {
      await m.react("🚫");
      return m.reply("🚫 *gomen ne...* you've been banned from me ♡");
    }

    // ── bot mode ─────────────────────
    if (!sock.public && !isOwner) return;

    // ── group details ──────────────────
    if (m.isGroup) {
      let meta = global.groupMetadataCache.get(m.chat);
      if (!meta) meta = await sock.groupMetadata(m.chat).catch(() => {});
      m.metadata = meta;
      const p = meta?.participants || [];
      m.isAdmin = p.some(
        (i) => (i.id === m.sender || i.jid === m.sender) && i.admin !== null
      );
      m.isBotAdmin = p.some(
        (i) => (i.id === botNumber || i.jid === botNumber) && i.admin !== null
      );
    }

    // ── before hooks ──────────────
    for (let name in plugins) {
      let plugin = plugins[name];
      if (typeof plugin?.before !== "function") continue;
      let stop = await plugin.before(m, {
        sock, isOwner,
        isAdmin: m.isAdmin,
        isBotAdmin: m.isBotAdmin,
        metadata: m.metadata,
      });
      if (stop) return;
    }

    // ── all hooks ────────────
    for (let name in plugins) {
      let plugin = plugins[name];
      if (typeof plugin?.all !== "function") continue;
      await plugin.all(m, {
        sock, isOwner,
        isAdmin: m.isAdmin,
        isBotAdmin: m.isBotAdmin,
        metadata: m.metadata,
      });
    }

    if (!isCmd) return;

    console.log(
      chalk.black.bgMagenta("\n 〄 SHIZUKA - MD \n"),
      chalk.magenta(`from : ${m?.pushName || m.sender}\n`),
      chalk.magenta(`command : ${cmd}`)
    );

    // ── auto typing ──────────
    if (global.autoTyping) {
      await sock.sendPresenceUpdate("composing", m.chat).catch(() => {});
    }

    // ── run plugins ──────────
    for (let name in plugins) {
      let plugin = plugins[name];
      if (!plugin?.command) continue;
      const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
      if (!cmds.includes(command)) continue;

      // ── start reaction ──
      await m.react("⏳");

      // ── permission checks ────────────────
      if (plugin.owner && !isOwner) {
        return;
      }
      if (plugin.premium && !m.isPremium) {
        await m.react("❌");
        return m.reply(
          "💎 *premium only, sorry~!*\nthis little feature is just for my premium friends ♡\n\nif you'd like to upgrade, just type *.benefitpremium*"
        );
      }
      if (plugin.group && !m.isGroup) {
        await m.react("❌");
        return m.reply("👥 *group only, silly~!*\nthis feature only works inside groups, okay? ♡");
      }
      if (plugin.private && m.isGroup) {
        await m.reply("💬 *private chat only~!*\nthis one's just for our little private talks ♡");
      }
      if (plugin.admin && !m.isAdmin) {
        await m.react("❌");
        return m.reply("🛡️ *admin only, gomen~!*\nyou'd need to be a group admin for this one ♡");
      }
      if (plugin.botAdmin && !m.isBotAdmin) {
        await m.react("❌");
        return m.reply("🤖 *i'm not admin yet~!*\nplease make me a group admin first, then i can help ♡");
      }

      // ── power / limit checks removed ──

      try {
        await plugin(m, {
          sock, args, text, q,
          quoted: m.quoted || m,
          mime, command, cmd, prefix,
          isOwner,
          isAdmin: m.isAdmin,
          isBotAdmin: m.isBotAdmin,
          metadata: m.metadata,
        });

        // ── end reaction ──────────
        await m.react("✅");

      } catch (err) {
        console.error(chalk.red(`[Error] plugin ${name}:`), err);
        // ── error reaction ──
        await m.react("❌");
        m.reply(
          `☢️ *oopsie...!*\n\nsomething went a little wrong with \`${cmd}\`~\n\n\`\`\`${err.message}\`\`\``
        );
      }
    }

    if (global.autoTyping) {
      await sock.sendPresenceUpdate("paused", m.chat).catch(() => {});
    }

  } catch (err) {
    console.log(util.format(err));
  }
};

process.on("uncaughtException", (err) => {
  console.error("uncaught exception:", err);
});

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  delete require.cache[file];
  require(file);
});