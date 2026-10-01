import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
await fs.mkdir('.local',{recursive:true});
const results=[],errors=[];
const sizes=process.env.LAYOUT_SIZES?process.env.LAYOUT_SIZES.split(',').map(s=>s.split('x').map(Number)):[[390,844],[320,568],[360,640],[430,932],[844,390],[1440,900]];
try{for(const [width,height] of sizes){
  const phone=width<900,context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:phone,hasTouch:phone});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('mi-sela-ti-journey-v1',JSON.stringify({solved:[0,1,2,3,4],short:true,gentle:false})));
  await page.goto(process.env.GIFT_URL||'http://127.0.0.1:5173',{waitUntil:'networkidle'});
  await page.waitForTimeout(2200);await page.screenshot({path:`.local/scene-${width}.png`});
  // Resume the final crossing to exercise the longest real letter fragment.
  await page.locator('#resume').click();await page.locator('#row').click();
  await page.locator('#decoder').waitFor({state:'visible',timeout:90000});await page.waitForTimeout(2500);
  await page.locator('#fragment-glyphs').click();await page.getByRole('button',{name:'Type A',exact:true}).click();
  assert.ok(await page.locator('#fragment-glyphs').isVisible(),'The source must stay visible after copying and typing');
  await page.getByRole('button',{name:'Delete last character',exact:true}).click();await page.locator('#translate').click();
  assert.ok(await page.locator('#collect').isVisible());
  const dockHeight=await page.locator('#keyboard-dock').evaluate(el=>el.getBoundingClientRect().height);
  for(const char of ['X','Z'])await page.getByRole('button',{name:`Type ${char}`,exact:true}).click();
  await page.locator('#translate').click();assert.ok(await page.locator('#unknown-notice').isVisible());
  assert.equal(await page.locator('#keyboard-dock').evaluate(el=>el.getBoundingClientRect().height),dockHeight,'Unknown words must not displace the source or keyboard');
  for(let i=0;i<2;i++)await page.getByRole('button',{name:'Delete last character',exact:true}).click();
  await page.locator('#translate').click();assert.ok(await page.locator('#collect').isVisible());
  for(const pronounce of [false,true]){
    if(pronounce)await page.locator('#show-roman').click();
    const layout=await page.evaluate(()=>{
      const bounds=id=>{const {x,y,width,height}=document.getElementById(id).getBoundingClientRect();return {x,y,width,height,bottom:y+height};};
      const text=document.getElementById('result-text');
      return {card:bounds('floating-letter'),dock:bounds('keyboard-dock'),source:bounds('fragment-glyphs'),keyboard:bounds('keyboard'),collect:bounds('collect'),result:{text:text.textContent,height:text.clientHeight,scrollHeight:text.scrollHeight},overflow:document.documentElement.scrollWidth>innerWidth,scroll:document.getElementById('decoder').scrollHeight>innerHeight};
    });
    assert.ok(!layout.overflow,'No horizontal overflow');assert.ok(!layout.scroll,'No scrolling panel');
    await page.screenshot({path:`.local/layout-${width}-${pronounce}.png`});
    assert.ok(layout.card.bottom<=layout.dock.y-4||layout.card.x+layout.card.width<=layout.dock.x-4,`The whole source must fit away from the keyboard: ${JSON.stringify({width,height,pronounce,layout})}`);
    assert.ok(layout.collect.bottom<=height&&layout.keyboard.bottom<=height,'All keys and collect fit on screen');
    assert.ok(layout.source.y>=0,'Source is on screen');
    results.push({width,height,pronounce,...layout});
  }
  await page.locator('#show-roman').click();await page.screenshot({path:`.local/decoder-${width}.png`});
  await context.close();
}}finally{await browser.close();}
console.log(JSON.stringify({results,errors},null,2));assert.equal(errors.length,0,'No browser or shader errors');
