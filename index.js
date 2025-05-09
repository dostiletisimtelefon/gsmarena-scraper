const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url parameter");

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const html = await page.content();
    await browser.close();

    const cameraBlock = html.match(/<td class="nfo"[^>]*data-spec="cam1modules"[^>]*>([\s\S]*?)<\/td>/i);
    let kamera = "Bulunamadı";
    if (cameraBlock) {
      kamera = cameraBlock[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .split("\n")
        .map(l => l.trim())
        .filter(l => l)
        .map(line => {
          const mp = line.match(/(\d{2,3})\s*MP/);
          let tip = "";
          if (/wide/i.test(line) && !/ultra/i.test(line)) tip = "Main";
          else if (/periscope/i.test(line)) tip = "Periscope";
          else if (/telephoto/i.test(line)) tip = "Telephoto";
          else if (/ultrawide/i.test(line)) tip = "Ultrawide";
          return mp ? `${mp[1]} MP${tip ? " (" + tip + ")" : ""}` : null;
        }).filter(Boolean).join("\n") + ",";
    }

    const antutuRaw = html.match(/<td class="nfo"[^>]*data-spec="tbench"[^>]*>([\s\S]*?)<\/td>/i);
    let antutu = "Bulunamadı";
    if (antutuRaw) {
      const clean = antutuRaw[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
      const v10 = clean.match(/AnTuTu:.*?(\d{5,})\s*\(v10\)/i);
      const v9 = clean.match(/AnTuTu:\s*(\d{5,})\s*\(v9\)/i);
      if (v10) antutu = `${v10[1]} (v10)`;
      else if (v9) antutu = `${v9[1]} (v9)`;
    }

    res.json({ kamera, antutu });
  } catch (err) {
    res.status(500).send("Hata: " + err.toString());
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log("Sunucu çalışıyor: PORT", port);
});
