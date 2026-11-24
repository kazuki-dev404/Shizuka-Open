// lib/serialize.js — serialize message (SHIZUKA - MD) ✨
/**
 * ───「 SHIZUKA - MD 」───
 * 📝 module   : message serializer
 * 🔧 function : parse & serialize whatsapp messages
 * 📦 version  : 1.0.0
 * ⚡ by @Kazuki.dev
 * ─────────────────────────
 */

"use strict";

require("../config.js");
const {
  extractMessageContent,
  jidNormalizedUser,
  proto,
  delay,
  getContentType,
  areJidsSameUser,
  generateWAMessage
} = require("dekzymarket-cyber");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ==================== channel context ♡ ====================
function saluranCtx() {
  return {
    forwardingScore: 9,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: global.idChannel || "120363427915199733@newsletter",
      newsletterName: global.botname || "Bot",
      serverMessageId: 127,
    },
  };
}

// ==================== pp cache ♡ ====================
const _ppCache = new Map();
const PP_CACHE_TTL = 5 * 60 * 1000;

// ==================== main serialize ♡ ====================
const serialize = async (conn, m) => {
  if (!m) return m;
  const { WebMessageInfo } = proto;

  // ===== key info ♡ =====
  if (m.key) {
    m.id = m.key.id;
    m.chat = /@s.whatsapp.net/.test(m.key.remoteJid)
      ? await conn.toLid(m.key.remoteJid)
      : m.key.remoteJid;
    m.isBaileys = m.id
      ? (m.id.startsWith("3EB0") || m.id.startsWith("B1E") ||
         m.id.startsWith("BAE") || m.id.startsWith("3F8") ||
         m.id.length < 32 || m.id.length == 18)
      : false;
    m.fromMe = m.key.fromMe;
    
    let botNumber = conn.user.id.split(":")[0] + "@s.whatsapp.net";
    if (/@s.whatsapp.net/.test(botNumber)) botNumber = await conn.toLid(botNumber);
    m.botNumber = botNumber;
    
    let ownerNum = await conn.toLid(global.owner + "@s.whatsapp.net");
    let own = global.db?.settings?.owner || [];
    
    m.isChannel = m.chat.endsWith("@newsletter");
    m.isGroup = m.chat.endsWith("@g.us");
    
    let sender = await conn.decodeJid(
      m.fromMe ? conn.user.id : (m.participant || m.key.participant || m.chat)
    );
    m.sender = /@s.whatsapp.net/.test(sender) ? await conn.toLid(sender) : sender;
    m.isOwner = m.sender == m.botNumber || m.sender == ownerNum || own.includes(m.sender);
    
    if (m.isGroup) {
      m.participant = m.key.participant && /@s.whatsapp.net/.test(m.key.participant)
        ? await conn.toLid(m.key.participant)
        : m.key.participant;
    }
  }

  // ===== message content ♡ =====
  if (m.message) {
    m.mtype = await getContentType(m.message);
    m.prefix = global.prefix;
    
    const content = m.message[m.mtype];
    m.msg = m.mtype === "viewOnceMessage"
      ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
      : content;
    
    m.body =
      m?.message?.conversation ||
      m?.msg?.caption ||
      m?.msg?.text ||
      (m.mtype === "extendedTextMessage" && m.msg.text) ||
      (m.mtype === "buttonsResponseMessage" && m.msg.selectedButtonId) ||
      (m.mtype === "interactiveResponseMessage" &&
        JSON.parse(m.msg.nativeFlowResponseMessage?.paramsJson || "{}")?.id) ||
      (m.mtype === "templateButtonReplyMessage" && m.msg.selectedId) ||
      (m.mtype === "listResponseMessage" && m.msg.singleSelectReply?.selectedRowId) ||
      "";

    // ===== quoted message ♡ =====
    const quotedMessage = (m.quoted = m.msg?.contextInfo?.quotedMessage || null);
    m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];

    if (quotedMessage) {
      let qType = getContentType(quotedMessage);
      m.quoted = quotedMessage[qType];
      
      if (qType === "productMessage") {
        qType = getContentType(m.quoted);
        m.quoted = m.quoted[qType];
      }
      
      if (typeof m.quoted === "string") m.quoted = { text: m.quoted };
      
      if (m.quoted) {
        m.quoted.key = {
          remoteJid: m.msg.contextInfo.remoteJid || m.from,
          participant: m.msg.contextInfo.participant && /@s.whatsapp.net/.test(m.msg.contextInfo.participant)
            ? await conn.toLid(m.msg.contextInfo.participant)
            : m.msg.contextInfo.participant,
          fromMe: areJidsSameUser(
            jidNormalizedUser(m.msg.contextInfo.participant),
            jidNormalizedUser(conn.user.id)
          ),
          id: m.msg.contextInfo.stanzaId,
        };
        
        m.quoted.mtype = qType;
        m.quoted.chat = /@s.whatsapp.net/.test(m.quoted.key.remoteJid)
          ? await conn.toLid(m.quoted.key.remoteJid)
          : m.quoted.key.remoteJid;
        m.quoted.id = m.quoted.key.id;
        m.quoted.isBaileys = m.quoted.id
          ? (m.quoted.id.startsWith("3EB0") || m.quoted.id.startsWith("B1E") ||
             m.quoted.id.startsWith("3F8") || m.quoted.id.startsWith("BAE") ||
             m.quoted.id.length < 32)
          : false;
        m.quoted.sender = await conn.decodeJid(m.quoted.key.participant);
        m.quoted.fromMe = m.quoted.sender === conn.user.id;
        m.quoted.text =
          m.quoted.text || m.quoted.caption || m.quoted.conversation ||
          m.quoted.contentText || m.quoted.selectedDisplayText ||
          m.quoted.title || "";
        m.quoted.mentionedJid = m.msg.contextInfo?.mentionedJid || [];
        
        const fakeObj = (m.quoted.fakeObj = WebMessageInfo.fromObject({
          key: m.quoted.key,
          message: quotedMessage,
          ...(m.isGroup ? { participant: m.quoted.sender } : {}),
        }));
        
        m.quoted.download = (saveToFile = false) =>
          conn.downloadMediaMessage(m.quoted, m.quoted.mtype.replace(/message/i, ""), saveToFile);
      }
    }
  }

  // ===== download ♡ =====
  if (m.msg?.url) {
    m.download = (saveToFile = false) =>
      conn.downloadMediaMessage(m.msg, m.mtype.replace(/message/i, ""), saveToFile);
  }

  m.text = m.body;

  // ==================== verified quoted ♡ ====================
  const userNum = (m.sender || "").split("@")[0];
  const botName = global.botname || "Bot";

  // variant 1: contact message (verifiedQuoted) ♡
  m.verifiedQuoted = {
    key: { 
      fromMe: false, 
      participant: "0@s.whatsapp.net", 
      remoteJid: "status@broadcast" 
    },
    message: {
      contactMessage: {
        displayName: botName,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${m.pushName || "User"};;;\nFN:${m.pushName || "User"}\nTEL;type=CELL;type=VOICE;waid=${userNum}:${userNum}\nEND:VCARD`,
      },
    },
  };

  // variant 2: order message (shopping bag icon) ♡
  m.orderQuoted = {
    key: { 
      fromMe: false, 
      participant: "0@s.whatsapp.net", 
      remoteJid: "status@broadcast" 
    },
    message: {
      orderMessage: {
        orderId: "1337",
        itemCount: "BOT READY",
        status: "INQUIRY",
        surface: "CATALOG",
        message: botName,
        orderTitle: "WhatsApp Bot Multi-Device",
        sellerJid: m.botNumber || "0@s.whatsapp.net",
        token: "shizuka-md-v1",
        totalAmount1000: 0,
        totalCurrencyCode: "IDR",
        contextInfo: {
          isForwarded: true,
          forwardingScore: 9,
          forwardedNewsletterMessageInfo: {
            newsletterJid: global.idChannel || "120363427915199733@newsletter",
            newsletterName: botName,
            serverMessageId: 127,
          },
        },
      },
    },
  };

  // variant 3: payment message ♡
  m.paymentQuoted = {
    key: { 
      remoteJid: "0@s.whatsapp.net", 
      fromMe: false, 
      id: "shizuka", 
      participant: "0@s.whatsapp.net" 
    },
    message: {
      requestPaymentMessage: {
        currencyCodeIso4217: "USD",
        amount1000: 999999999,
        requestFrom: "0@s.whatsapp.net",
        noteMessage: { extendedTextMessage: { text: botName } },
        expiryTimestamp: 999999999,
        amount: { value: 91929291929, offset: 1000, currencyCode: "USD" },
      },
    },
  };

  // ==================== reply function ♡ ====================
  m.reply = async (text, options = {}) => {
    if (text === null || text === undefined) return null;
    
    const chatId = options.chat || m.chat;
    const str = text.toString();
    const mentions = [...str.matchAll(/@(\d{0,19})/g)].map(v => v[1] + "@lid");

    return conn.sendMessage(
      chatId,
      {
        text: str,
        mentions,
        contextInfo: {
          mentionedJid: mentions,
          ...saluranCtx(),
          ...(options.contextInfo || {}),
        },
        ...options,
      },
      { quoted: m.verifiedQuoted }
    );
  };

  // ==================== react function ♡ ====================
  m.react = async (emoji) => {
    return conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key,
      },
    });
  };

  return m;
};

module.exports = serialize;