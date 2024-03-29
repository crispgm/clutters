const puppeteer = require('puppeteer');
const fs = require('fs');
const fetch = require('node-fetch');
const {Headers} = require('node-fetch');
const util = require('util');
const {exec, spawn} = require('child_process');

async function fetchZFList() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
  );
  await page.goto('https://www.zfrontier.com/app/shop-menu?menu=14');
  await page.waitForSelector('.list-container');

  const resultsSelector = 'a.mch-item';
  const links = await page.evaluate(resultsSelector => {
    const anchors = Array.from(document.querySelectorAll(resultsSelector));
    return anchors.map(anchor => {
      const id = anchor.href.split('?')[0].split('/mch/')[1];
      return {id: id, title: anchor.title, href: anchor.href};
    });
  }, resultsSelector);
  const data = [];
  for (let d of links) {
    data.push(d);
  }

  await browser.close();
  return data;
}

async function fetchKBDList() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
  );
  await page.goto('https://kbdfans.store/search?category=52058');
  await page.waitForSelector('.products-container');

  const resultsSelector = '.product-item';
  const links = await page.evaluate(resultsSelector => {
    const anchors = Array.from(document.querySelectorAll(resultsSelector));
    return anchors.map(anchor => {
      const item = JSON.parse(anchor.dataset.item);
      return {
        id: `${item.id}`,
        title: item.title,
        href: `https://kbdfans.store/products/${item.name}/`,
      };
    });
  }, resultsSelector);
  const data = [];
  for (let d of links) {
    data.push(d);
  }

  await browser.close();
  return data;
}

async function fetchGeekArkList() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
  );
  await page.goto(
    'https://www.geekark.com/product?&categorys=2&product_status=0,2',
  );
  await page.waitForSelector('.goodsBox');

  const resultsSelector = '.goodsBox_item_box>a.tit';
  const links = await page.evaluate(resultsSelector => {
    const anchors = Array.from(document.querySelectorAll(resultsSelector));
    return anchors.map(anchor => {
      const href = anchor.href;
      const id = href.split('/product/')[1];
      const title = anchor.querySelector('.tit_title').textContent;
      return {
        id,
        title,
        href,
      };
    });
  }, resultsSelector);
  const data = [];
  for (let d of links) {
    data.push(d);
  }

  await browser.close();
  return data;
}

function sendToLark(item) {
  const url = process.env.LARK_URL;
  const text = `${item.title}\n${item.href}`;

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: '发现键圈新预售',
            content: [[{tag: 'text', text}]],
          },
          en_us: {
            title: 'Found a New Mech Group Buy',
            content: [[{tag: 'text', text}]],
          },
        },
      },
    }),
  })
    .then(_result => {
      console.log('sent successfully');
    })
    .catch(err => {
      console.error(err);
    });
}

function sendToDiscord(item) {
  const url = process.env.DISCORD_URL;
  const text = `Found new GB: ${item.title}\n${item.href}`;

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: text,
    }),
  })
    .then(_result => {
      console.log('sent successfully');
    })
    .catch(err => {
      console.error(err);
    });
}

(async () => {
  console.log('loading data...');
  const fn = './temp/all.json';
  const allData = JSON.parse(fs.readFileSync(fn, 'utf8'));

  console.log('fetching kbdfans...');
  const kbdData = await fetchKBDList();
  console.log('fetching zfrontier...');
  const zfData = await fetchZFList();
  console.log('fetching geekark...');
  const gaData = await fetchGeekArkList();

  const newData = [...kbdData, ...zfData, ...gaData];

  console.log('walking and notifying...');
  for (const d of newData) {
    if (d.id in allData) {
      console.log(`item [${d.id}] existed`);
    } else {
      console.log(`item [${d.id}] pushed`);
      allData[d.id] = d;
      sendToLark(d);
      sendToDiscord(d);
    }
  }

  console.log('writing data...');
  fs.writeFileSync(fn, JSON.stringify(allData));
  console.log('done.');
})();
