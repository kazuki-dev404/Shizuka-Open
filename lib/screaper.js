const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const { fromBuffer } = require("file-type");

async function CatBox(buffer) {
    try {
        const fetchModule = await import("node-fetch");
        const fetch = fetchModule.default;
        const { ext } = await fromBuffer(buffer);
        const form = new FormData();
        form.append("fileToUpload", buffer, `file.${ext}`);
        form.append("reqtype", "fileupload");
        const res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: form
        });
        return await res.text();
    } catch {
        return null;
    }
};

async function uploadImageBuffer(buffer) {
    try {
        return await CatBox(buffer);
    } catch {
        return null;
    }
}


async function ssstt(tiktokUrl) {
  const url = encodeURIComponent(tiktokUrl);

  const sig = await fetch(`https://ssstt.io/gnstre?url=${url}`)
    .then(r => r.json());

  if (!sig.signature) throw new Error("couldn't grab signature... gomen");

  const create = await fetch(
    `https://a.ssstt.io/c?url=${url}&signature=${sig.signature}&timestamp=${sig.timestamp}`
  ).then(r => r.json());

  if (!create.photo_id && !create.video_id)
    throw new Error("no media id found... gomen");

  let res;

  while (true) {
    res = await fetch(
      `https://a.ssstt.io/p/${create.video_id || create.photo_id}`
    ).then(r => r.json());

    if (res.message === "completed") break;

    await delay(1500);
  }

  const meta = res.metadata || {};

  const base = {
    id: meta.id,
    caption: meta.t,
    author: {
      name: meta.nn,
      username: meta.at,
      avatar: meta.avt
    },
    stats: {
      views: meta.pc,
      likes: meta.dc,
      comments: meta.cc,
      shares: meta.sc
    }
  };

  // ===== video ♡ =====
  if (meta.ctt === "video") {
    return {
      type: "video",
      ...base,
      download: {
        video: res.download_links?.mp4,
        video_hd: res.download_links?.mp4_hd,
        audio: res.download_links?.mp3
      }
    };
  }

  // ===== photo / slide ♡ =====
  if (meta.ctt === "photo") {
    return {
      type: "photo",
      ...base,
      images: res.photodl_list || meta.i || [],
      audio: meta.m
    };
  }

  return base;
}


module.exports = {
    ssstt, 
    uploadImageBuffer,
    CatBox
};