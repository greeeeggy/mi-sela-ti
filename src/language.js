// A deliberately small, reversible language. One word corresponds to one word.
// English word order is retained; explicit forms keep decoding predictable.
const pairs = [
  ['i','mi'],['you','ti'],['love','sela'],['miss','mora'],['my','mia'],['me','min'],
  ['we','vi'],['us','vin'],['our','via'],['your','tia'],['yours','tian'],['mine','mian'],
  ['happy','ena'],['monthsary','selari'],['thank','nali'],['for','fo'],['loving','selan'],
  ['and','en'],['choosing','velan'],['choose','vela'],['know','nora'],['do','da'],
  ['not','ne'],['have','hara'],['much','mun'],['money','sona'],['right','reta'],['now','nu'],
  ['but','ba'],['never','neta'],['make','kira'],['feel','fela'],['small','sini'],
  ['patience','palia'],['kindness','kalia'],['the','la'],['quiet','sumi'],['ways','vayan'],
  ['way','vaya'],['care','kora'],['am','ama'],['doing','dan'],['best','bela'],['to','ta'],
  ['grow','gala'],['into','tana'],['someone','somen'],['can','ka'],['build','bira'],
  ['a','a'],['good','lena'],['life','lira'],['with','va'],['want','vana'],['give','dona'],
  ['more','mera'],['than','tela'],['promises','prian'],['promise','pria'],['time','ora'],
  ['effort','efra'],['honest','vera'],['heart','luma'],['until','tula'],['then','tanu'],
  ['let','leta'],['keep','kepa'],['learning','leran'],['how','hova'],['better','belari'],
  ['one','una'],['ordinary','orini'],['day','dia'],['at','ata'],['always','alva'],
  ['together','vila'],['home','oma'],['beautiful','lunia'],['are','ara'],['is','isa'],
  ['was','asa'],['will','vona'],['yes','ya'],['no','na'],['hello','halo'],['goodbye','vala'],
  ['today','nudia'],['tomorrow','vodia'],['yesterday','asdia'],['smile','sira'],
  ['because','kasa'],['even','eva'],['though','tova'],['still','stila'],['little','lili'],
  ['everything','omni'],['nothing','nomi'],['here','heri'],['there','teri'],['be','ava'],
  ['being','avan'],['so','sa'],['very','vemi'],['sorry','sori'],['please','peli'],
  ['stay','staya'],['hold','hola'],['hand','mana'],['hands','manan'],['eyes','elian'],
  ['dream','rima'],['dreams','riman'],['future','vora'],['laugh','lafa'],['sleep','soma'],
  ['safe','safi'],['peace','pasi'],['enough','enali'],['forever','alvari'],['kiss','kisi'],
  ['hug','humi'],['beautifully','luni'],['every','omna'],['again','rena'],['when','vena'],
  ['what','kova'],['where','veraia'],['why','kaya'],['who','humiya'],['it','ita'],
  ['this','di'],['that','dai'],['these','din'],['those','dain'],['something','somia'],
  ['all','omaia'],['only','sola'],['first','unaia'],['last','lasta'],['really','veri'],
  ['need','neda'],['see','elia'],['hear','eria'],['listen','erila'],['read','reda'],
  ['words','veran'],['word','veraon'],['letter','letra'],['lake','laka'],['sun','soli'],
  ['moon','luna'],['stars','staran'],['boat','bota'],['water','avaia'],['light','lumi'],
  ['try','tria'],['trying','trian'],['learn','lera'],['work','varka'],['working','varkan'],
  ['slowly','suma'],['walk','pada'],['waiting','varan'],['wait','vara'],['understand','noria'],
  ['understanding','norian'],['trust','trua'],['trusting','truan'],['breathe','bera'],
  ['thanks','nalis'],['of','ofa'],['in','ina'],['on','ona'],['from','fra'],['without','vane'],
  ['an','ane'],['as','asi'],['or','ori'],['if','ifi'],['too','tui'],['most','muna'],
  ['has','hari'],['had','haru'],['been','avu'],['would','voni'],['could','kai'],
  ['happy','ena'],['person','persona'],['girl','gira'],['boy','bayo'],['friend','fria'],
  ['girlfriend','giralia'],['boyfriend','bayalia'],['birthday','diari'],['morning','solia'],
  ['night','noriai'],['sweet','sula'],['dear','deri'],['darling','daria'],['baby','babi'],
  ['beautiful','lunia'],['cute','kuti'],['strong','strana'],['brave','brava'],['tired','tira'],
  ['sad','sada'],['okay','oki'],['eat','eda'],['food','edai'],['coffee','kafi'],
  ['soul','soria'],['remember','remi'],['memories','remian'],['memory','remia'],
];
export const dictionary = [...new Map(pairs.map(([en,sela])=>[en,{en,sela}])).values()];
const forward = new Map(dictionary.map(p=>[p.en,p.sela]));
const reverse = new Map(dictionary.map(p=>[p.sela,p.en]));
export const chapters = [
  {title:'The first words',en:'My love, happy monthsary. Thank you for loving me and for choosing us.'},
  {title:'Where I am today',en:'I know I do not have much money right now. But you never make me feel small.'},
  {title:'The things I notice',en:'Thank you for your patience, your kindness, and the quiet ways you care for me.'},
  {title:'The person I am becoming',en:'I am doing my best to grow into someone who can build a good life with you.'},
  {title:'More than a promise',en:'I want to give you more than promises: my time, my effort, and my honest heart.'},
  {title:'One ordinary day at a time',en:'Until then, let me keep learning how to love you better, one ordinary day at a time. I love you. Always.'},
];
export function translate(text,direction='toSela') {
  const map=direction==='toSela'?forward:reverse, unknown=new Set();
  const normalized=text.replace(/\bI'm\b/gi,'I am').replace(/\bdon't\b/gi,'do not').replace(/\bcan't\b/gi,'can not').replace(/\byou're\b/gi,'you are').replace(/\bI'll\b/gi,'I will');
  let output=normalized.replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g,word=>{
    const replacement=map.get(word.toLowerCase());
    if(!replacement){unknown.add(word.toLowerCase());return word;}
    return replacement;
  });
  if(direction==='toEnglish') output=output.replace(/(^|[.!?]\s+)([a-z])/g,(_,p,c)=>p+c.toUpperCase()).replace(/\bi\b/g,'I');
  return {text:output,unknown:[...unknown]};
}
export function normalize(text){return text.toLowerCase().replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim();}
export function phonetic(text) {
  const special={mi:'mee',min:'meen',mia:'mee ah',ti:'tee',tia:'tee ah',sela:'seh lah',selan:'seh lahn',selari:'seh lah ree',mora:'moh rah',luma:'loo mah',nali:'nah lee',vi:'vee',nu:'noo',ne:'neh',ta:'tah',fo:'foh',ba:'bah',en:'ehn',a:'ah'};
  return text.replace(/[a-z]+/gi,w=>special[w.toLowerCase()]||w.toLowerCase().replace(/a/g,'ah').replace(/i/g,'ee').replace(/u/g,'oo').replace(/o/g,'oh'));
}
export const encodedLetter=chapters.map(c=>translate(c.en).text);
