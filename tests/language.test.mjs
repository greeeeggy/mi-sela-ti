import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dictionary,translate,chapters,encodedLetter,normalize} from '../src/language.js';
test('The promised I love you translation works in both directions',()=>{assert.equal(translate('I love you').text,'mi sela ti');assert.equal(translate('Mi sela ti','toEnglish').text,'I love you');});
test('Every letter fragment is fully supported and round trips without losing words',()=>{for(let i=0;i<chapters.length;i++){assert.deepEqual(translate(chapters[i].en).unknown,[]);assert.deepEqual(translate(encodedLetter[i],'toEnglish').unknown,[]);assert.equal(normalize(translate(encodedLetter[i],'toEnglish').text),normalize(chapters[i].en));}});
test('Each vocabulary item has a unique Sela form',()=>{const forms=dictionary.map(p=>p.sela);assert.equal(new Set(forms).size,forms.length);});
test('Unknown words are preserved and reported rather than given invented translations',()=>{const result=translate('I love telescopes');assert.equal(result.text,'mi sela telescopes');assert.deepEqual(result.unknown,['telescopes']);});
test('Common contractions expand into word-level translations',()=>{assert.equal(translate("I'm happy").text,'mi ama ena');assert.equal(translate("I don't have money").text,'mi da ne hara sona');});
