const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const result = await page.evaluate(() => {
      const title = document.querySelector('meta[property="og:title"]')?.content || document.title;
      const image = document.querySelector('meta[property="og:image"]')?.content || '';
      let price = '';
      let availability = '';
      try {
        const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
        price = ld?.offers?.price || '';
        availability = ld?.offers?.availability?.includes('InStock') ? 'In Stock' : 'Out of Stock';
      } catch {}
      const currency = (document.querySelector('meta[property="product:price:currency"]')?.content) || '';
      return { title, price, currency, availability, image };
    });

    await browser.close();
    res.json({ url, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Scraper running on port ${port}`));
