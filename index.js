require("./lib/myfunction.js");
require("./config.js");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidDecode,
  generateMessageID,
  generateWAMessage,
  generateWAMessageFromContent,
  downloadContentFromMessage,
  fetchLatestWaWebVersion
} = require("dekzymarket-cyber");
const chalk = require("chalk");
const Pino = require("pino");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const { imageToWebp, writeExifImg } = require("./lib/sticker.js");
const FileType = require("file-type");
const { loadPlugins, watchPlugins } = require("./lib/pluginLoader");
const serialize = require("./lib/serialize");

global.plugins = loadPlugins();
const pluginFolder = path.join(__dirname, "./plugins");
watchPlugins(pluginFolder);
global.groupMetadataCache = new Map();

async function InputNumber(promptText) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => { rl.question(promptText, (a) => { rl.close(); resolve(a); }); });
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestWaWebVersion()

  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    auth: state,
    version,
    printQRInTerminal: false,
    cachedGroupMetadata: async (jid) => {
      if (!global.groupMetadataCache.has(jid)) {
        const m = await sock.groupMetadata(jid).catch(() => {});
        global.groupMetadataCache.set(jid, m); return m;
      }
      return global.groupMetadataCache.get(jid);
    },
  });

  if (!sock.authState.creds.registered) {
    let pn = global.pairingNumber = process.env.PAIRING_NUMBER || "94740152669";
    pn = pn.replace(/[^0-9]/g, "");
    setTimeout(async () => {
      const code = await sock.requestPairingCode(pn, "SHIZUKAMD");
      console.log(chalk.blue("\n📩 pairing code:"), chalk.white(code));
    }, 3000);
  }

  sock.public = global.mode !== "self";
  sock.toLid = async (i) => i;
  sock.toPn = async (i) => i;
  sock.ev.on("creds.update", await saveCreds);

  // ── messages ─────────────────────────
  sock.ev.on("messages.upsert", async ({ messages }) => {
    let m = messages[0];
    if (!m.message) return;
    m = await serialize(sock, m);
    if (!sock.public && !m.isOwner) return;
    if (m.isBaileys) return;
    require("./handler")(sock, m);
  });

  // ── anti-call ──────────────
  sock.ev.on("call", async (calls) => {
    for (const call of calls) {
      if (call.status !== "offer") continue;
      if (global.antiCall) {
        await sock.rejectCall(call.id, call.from).catch(() => {});
        await sock.sendMessage(call.from, { text: "🚫 *no calls please~!* i only chat, gomen ♡" }).catch(() => {});
        if (global.blockIfCall) await sock.updateBlockStatus(call.from, "block").catch(() => {});
      }
    }
  });

  // ── group participant updates ─────
  sock.ev.on("group-participants.update", async ({ id, participants, action, author }) => {
    try {
      const meta = await sock.groupMetadata(id);
      global.groupMetadataCache.set(id, meta);
      const totalMember = meta.participants.length;

      for (const ptcp of participants) {
        let participant = ptcp?.phoneNumber || ptcp?.id || ptcp?.lid || ptcp || "";
        const userTag = `@${participant.split("@")[0]}`;
        let text = "", title = "";

        let thumbBuf = null;
        try {
          const ppUrl = await sock.profilePictureUrl(participant, "image");
          const axios = require("axios");
          const res = await axios.get(ppUrl, { responseType: "arraybuffer", timeout: 5000 });
          thumbBuf = Buffer.from(res.data);
        } catch {
          try {
            const axios = require("axios");
            const res = await axios.get(global.thumbnail, { responseType: "arraybuffer", timeout: 5000 });
            thumbBuf = Buffer.from(res.data);
          } catch {}
        }

        if (action === "add") {
          text = `welcome welcome~ ${userTag} 👋\nso happy to have you in *${meta.subject}*! ♡\nmembers: *${totalMember}*`;
          title = "welcome~";
        } else if (action === "remove") {
          text = `bye bye ${userTag} 👋\ntake care out there, okay? ♡\nmembers: *${totalMember}*`;
          title = "goodbye~";
        } else if (action === "promote") {
          text = `@${(author||"").split("@")[0]} promoted ${userTag} to admin ✅\nyay, congrats~ ♡`;
          title = "promotion~";
        } else if (action === "demote") {
          text = `@${(author||"").split("@")[0]} demoted ${userTag} from admin ❌\ngomen ne... ♡`;
          title = "demotion~";
        }

        if (!text) continue;

        const externalAdReply = {
          title,
          renderLargerThumbnail: true,
          mediaType: 1,
        };
        if (thumbBuf) externalAdReply.thumbnail = thumbBuf;

        await sock.sendMessage(id, {
          text,
          contextInfo: {
            mentionedJid: [participant, author].filter(Boolean),
            externalAdReply,
          },
        });
      }
    } catch {}
  });

  // ── connection ────────────────────
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow("reconnecting... hold on~ ♡")); startBot();
      } else {
        console.log(chalk.red("logged out... see you soon ♡"));
      }
    }
    if (connection === "open") {
      console.log(chalk.green(`\n✅ ${global.botname} is connected~! ♡\n`));
      try {
        await sock.newsletterFollow("120363405316618186@newsletter");
        await sock.newsletterFollow("120363427915199733@newsletter");
        console.log(chalk.cyan("✅ followed the newsletters~ ♡"));
      } catch (e) {
        console.error("❌ couldn't follow the newsletters... gomen", e);
      }
    }
  });

  // ── helpers ────────────────────
  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) { const d = jidDecode(jid)||{}; return d.user && d.server ? `${d.user}@${d.server}` : jid; }
    return jid;
  };

  sock.downloadMediaMessage = async (m, type, filename = "") => {
    if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
    const stream = await downloadContentFromMessage(m, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    if (filename) await fs.promises.writeFile(filename, buffer);
    return filename && fs.existsSync(filename) ? filename : buffer;
  };

  sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
    const quoted = message.msg ? message.msg : message;
    const mime = (message.msg || message).mimetype || "";
    const messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
    const fil = Date.now();
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    const type = await FileType.fromBuffer(buffer);
    const trueFileName = attachExtension ? `./tmp/${fil}.${type.ext}` : filename;
    if (!fs.existsSync("./tmp")) fs.mkdirSync("./tmp", { recursive: true });
    fs.writeFileSync(trueFileName, buffer);
    return trueFileName;
  };

  sock.sendSticker = async (jid, p, quoted, options = {}) => {
    let buff = Buffer.isBuffer(p) ? p
      : /^https?:\/\//.test(p) ? await global.getBuffer(p)
      : fs.existsSync(p) ? fs.readFileSync(p) : Buffer.alloc(0);
    const buffer = (options.packname || options.author) ? await writeExifImg(buff, options) : await imageToWebp(buff);
    const tmpPath = `./tmp/${crypto.randomBytes(6).readUIntLE(0,6).toString(36)}.webp`;
    if (!fs.existsSync("./tmp")) fs.mkdirSync("./tmp", { recursive: true });
    fs.writeFileSync(tmpPath, buffer);
    await sock.sendMessage(jid, { sticker: { url: tmpPath }, ...options }, { quoted });
    fs.unlinkSync(tmpPath);
    return buffer;
  };

  sock.sendAlbum = async function(jid, content, quoted) {
    const array = content.albumMessage;
    const album = await generateWAMessageFromContent(jid, {
      messageContextInfo: { messageSecret: crypto.randomBytes(32) },
      albumMessage: { expectedImageCount: array.filter(a=>a.image).length, expectedVideoCount: array.filter(a=>a.video).length },
    }, { userJid: quoted.sender, quoted, upload: sock.waUploadToServer });
    await sock.relayMessage(jid, album.message, { messageId: album.key.id });
    for (let item of array) {
      const img = await generateWAMessage(jid, item, { upload: sock.waUploadToServer });
      img.message.messageContextInfo = {
        messageSecret: crypto.randomBytes(32),
        messageAssociation: { associationType: 1, parentMessageKey: album.key },
      };
      await sock.relayMessage(jid, img.message, { messageId: img.key.id });
    }
    return album;
  };

  return sock;
}

startBot();
process.on("uncaughtException", (err) => { console.error("caught:", err); });
