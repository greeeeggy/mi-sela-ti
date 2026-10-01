import './style.css';
import {chapters,encodedLetter,dictionary,translate,normalize} from './language.js';
import {LakeWorld} from './world.js';
import {Soundtrack,speak} from './audio.js';
import {CharacterPortrait} from './portrait.js';

const $=id=>document.getElementById(id), storageKey='mi-sela-ti-journey-v1';
const speakerIcon='<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>';
for(const id of ['listen-fragment','speak-result'])$(id).innerHTML=speakerIcon;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let saved={solved:[],gentle:reduced,short:false};
try{const data=JSON.parse(localStorage.getItem(storageKey));if(data&&Array.isArray(data.solved))saved={...saved,...data,solved:data.solved.filter(n=>Number.isInteger(n)&&n>=0&&n<chapters.length).sort()};}catch{}
let state='intro',chapter=saved.solved.length,travelElapsed=0,direction='toEnglish',roman=false,latin=false,workshop=false,returnState='travel',lastResult=null,returnRowing=false,paused=false,pausedState='intro',pausedRowing=false;
const soundtrack=new Soundtrack(),portrait=new CharacterPortrait($('portrait'));
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
function hideScreens(){for(const el of document.querySelectorAll('.screen'))el.hidden=true;document.body.classList.remove('is-decoding');}
function updateProgress(){document.querySelectorAll('#route i').forEach((el,i)=>{el.classList.toggle('done',saved.solved.includes(i));el.classList.toggle('current',i===chapter);});$('chapter-number').textContent=`${String(Math.min(chapter+1,6)).padStart(2,'0')} / 06`;$('chapter-title').textContent=chapters[chapter]?.title||'Every word, together';}
let world;try{world=new LakeWorld($('world'),{onFrame:(dt,speed)=>{
  if(state!=='travel'||paused||workshop)return;
  travelElapsed+=dt*speed;
  const duration=chapter===0?5:saved.short?8:20,progress=Math.min(1,travelElapsed/duration);world.progress=progress;$('travel-fill').style.width=`${progress*100}%`;
  if(progress>.7)$('travel-caption').textContent='There are words waiting for you.';
  if(progress>=1)arrive();
},onError:()=>{$('fatal').hidden=false;}});}catch{$('fatal').hidden=false;}
if(world){world.gentle=saved.gentle;}
$('gentle').checked=saved.gentle;$('short-crossing').checked=saved.short;
$('resume').hidden=saved.solved.length===0;

function resetTranslation(){lastResult=null;$('translation-input').value='';$('result-text').textContent='The meaning will appear here.';$('result-text').className='';$('speak-result').hidden=true;$('collect').hidden=true;$('unknown-notice').hidden=true;$('decoder').classList.remove('decoded');if(!workshop&&state==='decode'){$('fragment-glyphs').hidden=false;$('fragment-guide').hidden=false;}}
function setDirection(d){direction=d;$('source-label').textContent=d==='toEnglish'?'SELA':'ENGLISH';$('target-label').textContent=d==='toEnglish'?'ENGLISH':'SELA';$('translation-input').classList.toggle('glyph',d==='toEnglish'&&!latin);$('translation-input').classList.toggle('latin',d==='toSela'||latin);resetTranslation();renderKeyboard();}
function renderKeyboard(){
  const keyboard=$('keyboard');keyboard.replaceChildren();
  for(const row of ['qwertyuiop','asdfghjkl','zxcvbnm']){
    const div=document.createElement('div');div.className='key-row';
    for(const letter of row){const b=document.createElement('button');b.className='key';b.type='button';b.setAttribute('aria-label',`Type ${letter.toUpperCase()}`);const symbol=document.createElement('span');symbol.className=direction==='toEnglish'?'glyph':'';symbol.textContent=letter;const label=document.createElement('small');label.textContent=direction==='toEnglish'?letter.toUpperCase():'';b.append(symbol,label);b.addEventListener('click',()=>insert(letter));div.append(b);}keyboard.append(div);
  }
  const div=document.createElement('div');div.className='key-row';
  for(const [label,value,cls] of [['.','.','wide'],['space',' ','wide space'],['⌫','backspace','wide']]){const b=document.createElement('button');b.className=`key ${cls}`;b.textContent=label;b.setAttribute('aria-label',value==='backspace'?'Delete last character':value===' '?'Insert space':'Insert period');b.addEventListener('click',()=>insert(value));div.append(b);}keyboard.append(div);
}
function insert(value){const input=$('translation-input'),start=input.selectionStart??input.value.length,end=input.selectionEnd??start;let pos;if(value==='backspace'){input.value=input.value.slice(0,start===end?Math.max(0,start-1):start)+input.value.slice(end);pos=start===end?Math.max(0,start-1):start;}else{input.value=input.value.slice(0,start)+value+input.value.slice(end);pos=start+value.length;}input.setSelectionRange(pos,pos);input.scrollTop=input.scrollHeight;invalidate();}
function invalidate(){$('collect').hidden=true;$('decoder').classList.remove('decoded');lastResult=null;}
function loadFragment(){
  const c=chapters[chapter];$('decoder').classList.remove('workshop-mode');$('floating-letter').classList.remove('roman-open');$('fragment-glyphs').classList.remove('roman-text');$('fragment-title').textContent=c.title;$('fragment-count').textContent=`LETTER FRAGMENT ${String(chapter+1).padStart(2,'0')}`;$('fragment-glyphs').textContent=encodedLetter[chapter];$('roman-fragment').textContent=encodedLetter[chapter];$('roman-fragment').hidden=true;$('show-roman').textContent='Show pronunciation';$('show-roman').setAttribute('aria-expanded','false');roman=false;$('decoder-instruction').textContent='Tap the writing above, or use our keys.';$('fragment-glyphs').hidden=false;$('fragment-guide').hidden=false;$('listen-fragment').hidden=false;$('close-workshop').hidden=true;setDirection('toEnglish');
  world?.updateFragment(encodedLetter[chapter]);
}
function travel(){state='travel';workshop=false;hideScreens();$('journey').hidden=false;$('travel-ui').hidden=false;travelElapsed=0;world?.setMode('travel');world.rowing=false;world.progress=0;$('row').innerHTML='<span class="oar-mark">〰</span> Row onward';$('travel-caption').textContent=chapter===0?'Follow the light on the water.':'Take your time. The next words are waiting.';updateProgress();}
function arrive(){state='decode';world.rowing=false;world.setMode('decode');$('travel-ui').hidden=true;loadFragment();$('decoder').hidden=false;document.body.classList.add('is-decoding');updateProgress();soundtrack.note(523.25,0,4,.05);}
async function begin(resume=false){
  if(!resume){saved.solved=[];chapter=0;world.distance=0;persist();}else chapter=saved.solved.length;
  try{await soundtrack.start();$('sound').setAttribute('aria-label','Mute sound');$('sound').style.color='#f7d3a2';}catch{toast('You can turn sound on with the music button.');}
  if(chapter>=chapters.length){showLetter(true);return;}travel();
}
$('begin').addEventListener('click',()=>begin(false));$('resume').addEventListener('click',()=>begin(true));
function toggleRow(){if(state!=='travel'||paused||workshop)return;world.rowing=!world.rowing;$('row').innerHTML=world.rowing?'Rest a moment':'<span class="oar-mark">〰</span> Row onward';}
$('row').addEventListener('click',toggleRow);
window.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')&&!['TEXTAREA','INPUT','BUTTON'].includes(document.activeElement.tagName)&&state==='travel'){e.preventDefault();if(!e.repeat)toggleRow();}});
$('fragment-glyphs').addEventListener('click',()=>{if(direction!=='toEnglish')setDirection('toEnglish');$('translation-input').value=encodedLetter[chapter];$('translation-input').setSelectionRange(encodedLetter[chapter].length,encodedLetter[chapter].length);$('translation-input').scrollTop=0;invalidate();$('decoder-instruction').textContent='Ready when you are. Tap Translate.';$('translate').focus({preventScroll:true});$('floating-letter').classList.remove('copied');requestAnimationFrame(()=>$('floating-letter').classList.add('copied'));});
$('show-roman').addEventListener('click',()=>{roman=!roman;$('fragment-glyphs').classList.toggle('roman-text',roman);$('show-roman').textContent=roman?'Use our characters':'Show pronunciation';$('show-roman').setAttribute('aria-expanded',String(roman));});
$('listen-fragment').addEventListener('click',()=>speak(encodedLetter[chapter],toast));
$('translation-input').addEventListener('input',invalidate);
$('translate').addEventListener('click',()=>{
  const input=$('translation-input').value.trim();if(!input){toast('Collect the writing above, or type a few words.');return;}
  const result=translate(input,direction);lastResult=result;
  $('result-text').textContent=result.text;$('result-text').className=direction==='toSela'?'glyph':'';$('speak-result').hidden=false;
  $('unknown-notice').hidden=!result.unknown.length;$('unknown-notice').textContent=result.unknown.length?`Not in our wordbook yet: ${result.unknown.join(', ')}. These words were left as you typed them.`:'';
  if(!workshop&&direction==='toEnglish'&&normalize(input)===normalize(encodedLetter[chapter])&&!result.unknown.length){$('collect').hidden=false;$('decoder').classList.add('decoded');$('decoder-instruction').textContent='One more piece of what I wanted to tell you.';soundtrack.note(392,0,3,.06);}
});
$('speak-result').addEventListener('click',()=>{if(!lastResult)return;speak(direction==='toSela'?lastResult.text:$('translation-input').value,toast);});
$('swap').addEventListener('click',()=>{const old=lastResult?.text||'';setDirection(direction==='toSela'?'toEnglish':'toSela');$('translation-input').value=old;});
$('clear-input').addEventListener('click',resetTranslation);
$('alphabet-toggle').addEventListener('click',()=>{latin=!latin;$('alphabet-toggle').textContent=latin?'Our characters':'Latin letters';$('alphabet-toggle').setAttribute('aria-pressed',String(latin));$('translation-input').classList.toggle('glyph',direction==='toEnglish'&&!latin);$('translation-input').classList.toggle('latin',direction==='toSela'||latin);});
$('collect').addEventListener('click',()=>{
  if(state!=='decode'||workshop||!lastResult)return;
  if(!saved.solved.includes(chapter))saved.solved.push(chapter);saved.solved.sort();persist();soundtrack.collected();chapter++;updateProgress();
  if(chapter>=chapters.length){reveal();}else travel();
});
let revealTimer;function reveal(){state='finale';hideScreens();$('journey').hidden=false;$('travel-ui').hidden=true;world.setMode('finale');soundtrack.reveal();$('chapter-number').textContent='06 / 06';$('chapter-title').textContent='Every word, together';revealTimer=setTimeout(()=>{if(state==='finale')showLetter(false);},saved.gentle?1600:4200);}
let letterTimers=[];function clearLetterTimers(){letterTimers.forEach(clearTimeout);letterTimers=[];}
function showLetter(immediate=false){
  clearLetterTimers();state='letter';hideScreens();$('revelation').hidden=false;world.setMode('letter');$('portrait-button').hidden=!immediate;$('full-letter').replaceChildren();
  if(!saved.gentle&&!immediate){$('revelation').classList.add('screen-shake');setTimeout(()=>$('revelation').classList.remove('screen-shake'),700);}
  let count=0;
  chapters.forEach((c,idx)=>{
    const p=document.createElement('p'),english=c.en.split(/(\s+)/),sela=encodedLetter[idx].split(/(\s+)/);
    english.forEach((word,i)=>{if(/^\s+$/.test(word)){p.append(document.createTextNode(word));return;}const span=document.createElement('span');span.textContent=immediate?word:sela[i];span.className=immediate?'':'glyph';p.append(span);
      if(!immediate){const delay=(saved.gentle?500:1100)+count*(saved.gentle?55:150);letterTimers.push(setTimeout(()=>{span.classList.add('converting');span.textContent=word;span.classList.remove('glyph');setTimeout(()=>span.classList.remove('converting'),650);if(idx===chapters.length-1&&i>=english.length-2)$('portrait-button').hidden=false;},delay));count++;}
    });$('full-letter').append(p);
  });
  if(!immediate)letterTimers.push(setTimeout(()=>$('portrait-button').hidden=false,(saved.gentle?600:1400)+count*(saved.gentle?55:150)));
}
async function showPortrait(kind='her'){
  clearLetterTimers();state='portrait';hideScreens();$('portrait-screen').hidden=false;world.setMode('portrait');$('portrait-ending')?.classList.remove('visible');document.querySelector('.portrait-ending').classList.remove('visible');$('portrait-eyebrow').textContent=kind==='her'?'THE WORDS FOUND THEIR WAY TO YOU':'EVERY LITTLE WORD. BOTH OF US.';$('portrait-switch').textContent=kind==='her'?'Our picture':'Your portrait';
  portrait.stop();portrait.gentle=saved.gentle;
  try{await portrait.load(kind);soundtrack.reveal();portrait.start(()=>document.querySelector('.portrait-ending').classList.add('visible'));}catch{toast('The portrait could not load. Please try again.');document.querySelector('.portrait-ending').classList.add('visible');}
}
$('portrait-button').addEventListener('click',()=>showPortrait());$('portrait-switch').addEventListener('click',()=>showPortrait(portrait.kind==='her'?'us':'her'));
$('read-again').addEventListener('click',()=>{portrait.stop();showLetter(true);});$('save-portrait').addEventListener('click',()=>{if(portrait.data)portrait.save();});
window.addEventListener('resize',()=>{if(state==='portrait'&&portrait.data)portrait.layout();});

function openWorkshop(){
  if(state==='finale')return;returnState=state;returnRowing=world.rowing;world.rowing=false;portrait.stop();workshop=true;hideScreens();$('decoder').hidden=false;$('decoder').classList.add('workshop-mode');document.body.classList.add('is-decoding');$('fragment-count').textContent='A LANGUAGE FOR TWO';$('fragment-title').textContent='Our keyboard';$('fragment-glyphs').hidden=true;$('fragment-guide').hidden=true;$('roman-fragment').hidden=true;$('floating-letter').classList.remove('roman-open');$('listen-fragment').hidden=true;$('decoder-instruction').textContent='Write in English or Sela with our keys.';$('close-workshop').hidden=false;setDirection('toSela');world.setMode('decode');
}
function closeWorkshop(){workshop=false;hideScreens();state=returnState;if(state==='portrait'){$('portrait-screen').hidden=false;portrait.finished=true;portrait.drawStatic();document.querySelector('.portrait-ending').classList.add('visible');world.setMode('portrait');}else if(state==='letter'){showLetter(true);}else if(state==='intro'){$('intro').hidden=false;world.setMode('intro');}else{$('journey').hidden=false;world.setMode(state);world.rowing=returnRowing;if(state==='decode'){loadFragment();$('decoder').hidden=false;document.body.classList.add('is-decoding');$('travel-ui').hidden=true;}else $('travel-ui').hidden=false;}}
$('open-workshop').addEventListener('click',openWorkshop);$('close-workshop').addEventListener('click',closeWorkshop);
$('settings-workshop').addEventListener('click',()=>{$('settings-dialog').close();openWorkshop();});
function pause(){paused=true;pausedState=state;pausedRowing=world.rowing;world.rowing=false;}
function unpause(){paused=false;if(state==='travel'&&state===pausedState)world.rowing=pausedRowing;}
$('settings').addEventListener('click',()=>{pause();$('settings-dialog').showModal();});$('home').addEventListener('click',()=>{pause();$('settings-dialog').showModal();});$('close-settings').addEventListener('click',()=>$('settings-dialog').close());$('settings-dialog').addEventListener('close',unpause);
$('gentle').addEventListener('change',()=>{saved.gentle=$('gentle').checked;world.gentle=saved.gentle;persist();});$('short-crossing').addEventListener('change',()=>{saved.short=$('short-crossing').checked;persist();});
$('restart').addEventListener('click',()=>{clearTimeout(revealTimer);clearLetterTimers();portrait.stop();$('settings-dialog').close();begin(false);});
$('sound').addEventListener('click',async()=>{if(soundtrack.enabled){soundtrack.mute();$('sound').setAttribute('aria-label','Turn sound on');$('sound').style.color='';}else{try{await soundtrack.start();$('sound').setAttribute('aria-label','Mute sound');$('sound').style.color='#f7d3a2';}catch{toast('Sound could not start on this browser.');}}});
function wordbook(){pause();$('wordbook').showModal();$('word-search').value='';renderWords('');}
function renderWords(query){const container=$('word-list');container.replaceChildren();for(const entry of dictionary.filter(p=>p.en.includes(query.toLowerCase())||p.sela.includes(query.toLowerCase())).sort((a,b)=>a.en.localeCompare(b.en))){const row=document.createElement('div');row.className='word-entry';const en=document.createElement('span');en.textContent=entry.en;const s=document.createElement('div');const g=document.createElement('span');g.className='glyph';g.textContent=entry.sela;const roman=document.createElement('small');roman.textContent=entry.sela;s.append(g,roman);const b=document.createElement('button');b.className='icon-button';b.textContent='♫';b.setAttribute('aria-label',`Pronounce ${entry.sela}`);b.addEventListener('click',()=>speak(entry.sela,toast));row.append(en,s,b);container.append(row);}}
$('dictionary-button').addEventListener('click',wordbook);$('close-wordbook').addEventListener('click',()=>$('wordbook').close());$('wordbook').addEventListener('close',unpause);$('word-search').addEventListener('input',()=>renderWords($('word-search').value));
document.addEventListener('visibilitychange',()=>{if(document.hidden){world.rowing=false;if(state==='travel')$('row').innerHTML='<span class="oar-mark">〰</span> Row onward';if(soundtrack.ctx)soundtrack.ctx.suspend();window.speechSynthesis?.cancel();}else if(soundtrack.enabled)soundtrack.ctx?.resume();});
// The in-page keyboard occupies a known area. Do not summon a second, native keyboard on a phone.
function inputMode(){const touch=matchMedia('(pointer: coarse)').matches||innerWidth<700;$('translation-input').readOnly=touch;$('translation-input').setAttribute('inputmode',touch?'none':'text');}
inputMode();window.addEventListener('resize',inputMode);
$('translation-input').addEventListener('keydown',e=>{if(!$('translation-input').readOnly||e.ctrlKey||e.metaKey||e.altKey)return;if(/^[a-z .]$/i.test(e.key)){e.preventDefault();insert(e.key.toLowerCase());}else if(e.key==='Backspace'){e.preventDefault();insert('backspace');}else if(e.key==='Enter'){e.preventDefault();$('translate').click();}});
renderKeyboard();
