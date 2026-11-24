// Load & update user/group data per message — SHIZUKA - MD ✨

module.exports = async (sock, m) => {
  if (!m || !m.chat) return;

  // ── settings defaults ♡ ─────────────────
  if (!global.db.settings) global.db.settings = {};
  if (!global.db.settings.totalhit) global.db.settings.totalhit = 0;
  if (!global.db.settings.owner) global.db.settings.owner = [];
  if (!global.db.settings.premium) global.db.settings.premium = [];
  if (!global.db.settings.partner) global.db.settings.partner = [];
  if (!global.db.settings.banned) global.db.settings.banned = [];
  if (!global.db.settings.namaSaveContact) global.db.settings.namaSaveContact = "Buyer";
  if (!global.db.settings.jedaPushkontak) global.db.settings.jedaPushkontak = 4000;
  if (!global.db.settings.bljpm) global.db.settings.bljpm = [];

  // ── user defaults ♡ ─────────────────────
  if (m.sender) {
    if (!global.db.users[m.sender]) {
      global.db.users[m.sender] = {
        id: m.sender,
        name: m.pushName || "",
        registered: false,
        koin: 0,
        exp: 0,
        energi: global.energiDefault || 50,
        lastReset: Date.now(),
        isPremium: false,
        limit: global.energiDefault || 50,
      };
    }
    // update name
    if (m.pushName) global.db.users[m.sender].name = m.pushName;
    // daily energy refresh ♡
    const user = global.db.users[m.sender];
    const now = Date.now();
    const lastReset = user.lastReset || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (now - lastReset >= oneDayMs) {
      user.energi = global.energiDefault || 50;
      user.limit = global.energiDefault || 50;
      user.lastReset = now;
    }
  }

  // ── group defaults ♡ ────────────────────
  if (m.isGroup && m.chat) {
    if (!global.db.groups[m.chat]) {
      global.db.groups[m.chat] = {
        id: m.chat,
        welcome: global.welcomeDefault || false,
        goodbye: global.goodbyeDefault || false,
        antilink: false,
        antilinkall: false,
        antitagsw: false,
        antitoxic: false,
        antidocument: false,
        antisticker: false,
        antimedia: false,
        antibot: false,
        autodl: false,
        hidetag: false,
        detect: false,
        sewa: false,
        sewaExpiry: 0,
      };
    }
  }
};