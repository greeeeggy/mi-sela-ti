import {chromium} from '@playwright/test';
const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
p.on('pageerror',e=>console.log('ERROR:',e.message));p.on('console',m=>{if(m.type()==='error')console.log(m.text());});
await p.goto('http://localhost:5173',{waitUntil:'networkidle'});await p.locator('#settings').click();await p.locator('#short-crossing').check();await p.locator('#close-settings').click();await p.locator('#begin').click();await p.locator('#row').click();
await p.evaluate(()=>{window.framesCount=0;function f(){window.framesCount++;requestAnimationFrame(f)}requestAnimationFrame(f)});
await p.waitForTimeout(10000);console.log(await p.evaluate(()=>({row:document.querySelector('#row').textContent,progress:document.querySelector('#travel-fill').style.width,decoder:document.querySelector('#decoder').hidden,frames:window.framesCount,fatal:document.querySelector('#fatal').hidden})));await p.screenshot({path:'.local/inspect.png'});await b.close();
