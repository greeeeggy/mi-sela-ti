import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
await fs.mkdir('.local',{recursive:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.addInitScript(()=>{window.spoken=[];window.speechSynthesis.speak=u=>window.spoken.push(u.text);});
await page.goto(process.env.GIFT_URL||'http://localhost:5173',{waitUntil:'networkidle'});await page.waitForTimeout(1500);await page.screenshot({path:'.local/phone-start.png'});
await page.getByRole('button',{name:'Journey settings',exact:true}).click();await page.locator('#short-crossing').check();await page.getByRole('button',{name:'Close settings',exact:true}).click();
await page.getByRole('button',{name:'Take the boat',exact:true}).click();await page.getByRole('button',{name:'Row onward',exact:false}).click();await page.locator('#decoder').waitFor({state:'visible',timeout:60000});await page.waitForTimeout(2000);await page.screenshot({path:'.local/phone-decoder.png'});
for(let i=0;i<6;i++){
  if(i>0){await page.getByRole('button',{name:'Row onward',exact:false}).click();await page.locator('#decoder').waitFor({state:'visible',timeout:60000});}
  await page.getByRole('button',{name:'Place this fragment in the keyboard',exact:true}).click();await page.getByRole('button',{name:'Translate',exact:true}).click();await page.locator('#collect').waitFor({state:'visible'});await page.locator('#collect').click();
}
await page.locator('#revelation').waitFor({state:'visible',timeout:15000});await page.locator('#portrait-button').waitFor({state:'visible',timeout:35000});await page.screenshot({path:'.local/phone-letter.png'});await page.locator('#portrait-button').click();await page.locator('.portrait-ending.visible').waitFor({timeout:25000});await page.waitForTimeout(2000);await page.screenshot({path:'.local/phone-portrait.png'});
await page.locator('#open-workshop').click();
if(!(await page.locator('#translation-input').evaluate(el=>el.readOnly&&el.inputMode==='none')))throw new Error('Phone would open a second keyboard');
for(const char of 'i love you'){await page.getByRole('button',{name:char===' '?'Insert space':`Type ${char.toUpperCase()}`,exact:true}).click();}
await page.locator('#translate').click();if(await page.locator('#result-text').textContent()!=='mi sela ti')throw new Error('English to Sela failed');await page.locator('#speak-result').click();if(!(await page.evaluate(()=>window.spoken.includes('mee seh lah tee'))))throw new Error('Pronunciation button failed');await page.locator('#swap').click();await page.locator('#translate').click();if(await page.locator('#result-text').textContent()!=='I love you')throw new Error('Sela to English failed');
await page.locator('#clear-input').click();await page.getByRole('button',{name:'Type M',exact:true}).click();await page.getByRole('button',{name:'Type I',exact:true}).click();if(await page.locator('#translation-input').inputValue()!=='mi')throw new Error('Character keys failed');await page.getByRole('button',{name:'Delete last character',exact:true}).click();if(await page.locator('#translation-input').inputValue()!=='m')throw new Error('Backspace failed');
await page.locator('#dictionary-button').click();await page.locator('#word-search').fill('heart');if(await page.locator('.word-entry').count()!==1)throw new Error('Wordbook search failed');await page.locator('#close-wordbook').click();await page.locator('#close-workshop').click();await page.locator('#portrait-switch').click();await page.locator('.portrait-ending.visible').waitFor({timeout:25000});await page.screenshot({path:'.local/phone-couple.png'});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw new Error('Phone has horizontal overflow');
await page.reload({waitUntil:'networkidle'});if(!(await page.locator('#resume').isVisible()))throw new Error('Progress did not survive reload');
const desktop=await browser.newPage({viewport:{width:1440,height:900}});await desktop.goto(process.env.GIFT_URL||'http://localhost:5173',{waitUntil:'networkidle'});await desktop.screenshot({path:'.local/desktop-start.png'});
console.log(JSON.stringify({errors,phoneJourney:'complete',translation:'both directions',keyboard:'passed',pronunciationButton:'passed',wordbook:'passed',resume:'passed',horizontalOverflow:overflow},null,2));await browser.close();if(errors.length)process.exitCode=1;
