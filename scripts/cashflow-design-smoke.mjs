import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const origin=process.env.PROTOTYPE_URL||'http://localhost:3012';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
mkdirSync('artifacts',{recursive:true});
const goto=async path=>{await page.goto(origin+path,{waitUntil:'networkidle'});};
const shot=async name=>{await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await page.screenshot({path:`artifacts/cashflow-${name}.png`,fullPage:true});};
try {
  await goto('/prototype/finance');
  await page.getByRole('button',{name:'Reset data simulasi'}).click();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('rimbaloka-prototype-v1')).state);
  const tripId=state.trips[0].id;
  assert.equal(await page.locator('.cf-metric').count(),3);
  const selector=page.getByLabel('Lihat tanggal');
  await selector.selectOption('29');
  assert.match(await page.locator('.cf-profit-detail').innerText(),/Rp\s*1\.115\.000/);
  await selector.selectOption('1');
  assert.equal(await selector.inputValue(),'1');
  assert.equal(await page.locator('.cf-profit-line').count(),2);
   assert.match(await page.locator('.cf-profit-periods').innerText(),/September 2026[\s\S]*Agustus 2026/);
   assert.match(await page.locator('.cf-profit-periods').innerText(),/Rp\s*1\.115\.000/);

  await page.getByRole('button',{name:'Tahunan',exact:true}).click();
  assert.equal(await page.getByLabel('Lihat bulan').locator('option').count(),12);
  assert.match(await page.locator('.cf-profit-periods').innerText(),/2026[\s\S]*2025/);
  await shot('year-desktop');
  await page.getByRole('button',{name:'Mingguan',exact:true}).click();
  assert.equal(await page.locator('.cf-graph').count(),0);
  assert.equal(await page.locator('.cash-balance').count(),1);
  await page.getByRole('button',{name:'Bulanan',exact:true}).click();
  await shot('overview-desktop');
  await page.locator('.cash-week summary').first().click();
  await shot('recap-desktop');
  await page.locator('.cash-trip').first().click();
  assert.equal(await page.locator('.cf-graph').count(),0);
  assert.equal(await page.getByRole('tab',{name:/Transaksi/}).getAttribute('aria-selected'),'true');
  await page.getByRole('tab',{name:/Transaksi/}).focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.receivables').count(),1);
  await page.keyboard.press('End');assert.equal(await page.locator('.expense-breakdown').count(),1);
  await page.keyboard.press('Home');assert.equal(await page.locator('.cf-ledger').count(),1);
  await shot('detail-desktop');
  for(const width of [375,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    await goto('/prototype/finance');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overview overflow ${width}`);
    if(width===375)await shot('overview-mobile');
    await goto('/prototype/finance?trip='+tripId);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`detail overflow ${width}`);
    if(width===375) {
      assert.equal(await page.locator('.cf-ledger-table').evaluate(el=>getComputedStyle(el).display),'block');
      assert.ok(await page.locator('.cf-ledger-table').evaluate(el=>el.scrollWidth<=el.clientWidth));
      await shot('detail-mobile');
    }
  }
  await goto('/prototype/finance');
  await page.getByLabel('Tanggal acuan (WIB)').fill('2030-01-01');
  assert.equal(await page.locator('.cf-chart-empty').count(),1);
  assert.equal(await page.locator('.cf-recap .cf-empty').count(),1);
  assert.equal(await page.locator('.cf-profit-line').count(),0);
  assert.match(await page.locator('.cf-profit-periods').innerText(),/Rp\s*0/);
  await page.getByRole('button',{name:'Periode berikutnya'}).click();
  assert.equal(await page.getByLabel('Tanggal acuan (WIB)').inputValue(),'2030-02-01');
  await page.getByRole('button',{name:'Periode sebelumnya'}).click();
  assert.equal(await page.getByLabel('Tanggal acuan (WIB)').inputValue(),'2030-01-01');
  assert.deepEqual(errors,[]);
  console.log('PASS: cashflow summaries, interactive chart, drilldown, keyboard tabs, period navigation, empty state, desktop/tablet/mobile layouts and mobile transaction cards.');
} finally {await browser.close();}
