# Mi sela ti

A monthsary gift: a girl, a small wooden boat, a sunset lake, and a letter waiting to be understood.

The lake and character are rendered in Three.js. Six floating fragments stop the journey; collect the writing, translate it with the Sela keyboard, and keep each piece. When the letter is complete, its words gradually become English. The same custom characters then gather into a portrait.

The rowboat has a hollow timber hull, curved plank seams, brass rowlocks, carved oars, a linen blanket, and a letter beside the candle lantern. The character wears the black shirt and yellow collar from the supplied photographs, with a swept hair part, ponytail, silver hoops, blinking eyes, and hands that follow the oar grips. The shoreline includes individually instanced willow leaves, reeds, rocks, and flowering lily pads. The water reflects the actual scene, with wave distortion, sunset glints, paddle ripples, and a trailing wake. Tapping nearby water makes a ripple.

Paddling applies periodic thrust to a 115 kg boat-and-passenger model. Linear and quadratic water drag govern acceleration and coasting. Four wave samples drive damped buoyancy, pitch, and roll; the visible surface shares the simulation's wave definition. The simulation uses fixed 1/120-second steps. Hair and lantern motion use separate damped springs. This is a lightweight scene simulation, not a boating simulator.

## Play

Open the [gift](https://greeeeggy.github.io/mi-sela-ti/) on a phone or computer. Tap **Take the boat**, then **Row onward**. Tap again to rest. At each fragment, tap the writing, then **Translate**, then **Keep this piece**. Crossing lengths are measured by progress at cruising speed: the first uses five seconds of progress and later crossings use twenty. Initial acceleration adds a few seconds, and resting lets the boat coast.

The menu offers gentler motion and eight-second crossings. Progress stays in the current browser. Sound starts after the first tap; the music button toggles the original piano-like soundtrack and water ambience.

## The language

Sela is a small, word-level constructed language, with English word order and a custom 26-character script. The starter wordbook has 212 entries. Each Sela word has a single defined English equivalent; no word secretly expands into an entire sentence.

| English | Sela |
| --- | --- |
| I | mi |
| love | sela |
| you | ti |
| miss | mora |
| heart | luma |

`I love you` ↔ `mi sela ti`.

The keyboard works in both directions and supports physical typing as well as touch keys. On phones the custom keyboard replaces the native text keyboard, keeping the original fragment pinned above it. Copying or typing never dismisses the fragment or moves the page. Pronunciation switches the same pinned words to their Latin spelling without expanding the card. Short landscape screens put the fragment beside the keyboard. The **Latin letters** toggle changes the input spelling display. The wordbook includes pronunciation buttons. Unknown words remain unchanged and are explicitly identified; this is a starter language, not an unrestricted English translator.

Pronunciation is generated through the browser's speech synthesis with a phonetic guide. Available voices and their interpretation vary by device. `mi sela ti` is guided as **mee seh lah tee**. The browser's speech capability must be available for the speaker buttons to play.

## The letter

The English letter lives in `src/language.js`, inside `chapters`. Its Sela version is derived from the wordbook automatically, so the story, decoder, and final letter remain consistent.

To personalize the letter, edit those six paragraphs. Add any new English words and their unique Sela translations to `pairs` in the same file, then run the tests and rebuild. Keep one English word per Sela word. The tests check that every letter fragment translates completely and returns to the same words.

## Run and publish

Requires Node.js 22.12+ or a compatible current version.

```sh
npm ci
npm run dev
npm test
npm run build
```

To update the GitHub Pages build:

```sh
npx vite build --outDir docs
# Keep docs/.nojekyll present.
git add .
git commit -m "Update the gift"
git push origin codex/monthsary
```

GitHub Pages serves `/docs` from the `codex/monthsary` branch. Vite uses relative asset paths so the site also works under a repository URL.

## Assets and privacy

The lake shaders, boat, girl, trees, lilies, lights, character font, musical notes, and portrait animation were created for this gift. No external models, image services, API keys, analytics, or paid services are used at runtime. Three.js is bundled with the app.

The provided photographs were sampled locally into RGB grids in `public/portrait-her.json` and `public/portrait-us.json`. The published site renders those grids entirely with the custom font. Original JPEG files are not included. The character portraits and letter are intentionally accessible to anyone who can open the public gift; an obscure link is not a password.

`tools/make_assets.py` rebuilds the font and sampled portrait data from the original photos in the owner's Downloads folder. It requires Pillow and fontTools locally; recipients need neither. Its photographic crop previews stay in ignored `.local/` and are not published.

## Verification

- Five language tests check both directions, letter completeness, unique translations, contractions, and unknown words. Four physics tests check acceleration, coasting, anchoring, stable buoyancy, and equivalent movement at 30, 60, and 120 render frames per second.
- `tools/check-browser.mjs` runs the full six-fragment journey in a 390 × 844 touch-enabled Chrome viewport, checks the keyboard and wordbook, verifies the pronunciation button's speech request, checks resume after reload, and captures desktop and phone screenshots.
- `tools/check-layout.mjs` checks the longest real fragment at 320 × 568, 360 × 640, 390 × 844, 430 × 932, 844 × 390, and 1440 × 900. It copies the source, types and deletes a character, translates, toggles pronunciation, and checks that source, keys, and collection controls stay on screen without a scrolling decoder.
- `tools/check-final.mjs` checks the published phone layout at twice the viewport pixel density and the portrait PNG download. Set `GIFT_URL` to the published address to check deployment.
- The browser check verifies the UI request to speak. It does not certify the sound of a physical phone's installed voice or the performance of a particular phone.

Reference documentation: [Three.js](https://threejs.org/docs/), [browser speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
