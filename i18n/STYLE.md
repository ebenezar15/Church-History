# Tamil translation guide (Ecclesia Atlas)

Input files are JSON objects: `{ "<key>": "<English text>" }`.
Output files must have **exactly the same keys**, with the value translated into Tamil (தமிழ்).

## Rules
- Output valid JSON (UTF-8, raw Tamil characters, no `\u` escapes needed). Escape `"` inside strings as `\"`.
- Keep every key; never translate keys. Do not drop or merge entries.
- Translate the meaning faithfully and completely — no summarising, no omissions, no added opinions.
  The tone is neutral, scholarly and descriptive (an encyclopedia for Tamil-speaking Christians and students).
- Write natural, modern literary Tamil as used in Tamil Christian publishing (both Protestant and Catholic readers).
- Keep markdown, line breaks (`\n`, blank lines between paragraphs), numbers, years, dates and Bible verse numbers.
- Bible references: use Tamil book names (Union Version style), keep chapter:verse numbers, e.g.
  John 3:16 → யோவான் 3:16, Romans 13:13-14 → ரோமர் 13:13-14, Genesis → ஆதியாகமம், Exodus → யாத்திராகமம்,
  Matthew → மத்தேயு, Mark → மாற்கு, Luke → லூக்கா, Acts → அப்போஸ்தலர், 1 Corinthians → 1 கொரிந்தியர்,
  Galatians → கலாத்தியர், Ephesians → எபேசியர், Hebrews → எபிரெயர், Revelation → வெளிப்படுத்தின விசேஷம், Psalms → சங்கீதம்,
  Isaiah → ஏசாயா, James → யாக்கோபு, Philippians → பிலிப்பியர், Colossians → கொலோசெயர், Daniel → தானியேல்.
- Names of people and places: transliterate into Tamil script in the form Tamil Christians commonly use
  (Augustine → அகஸ்டின், Martin Luther → மார்ட்டின் லூத்தர், John Calvin → ஜான் கால்வின், Paul → பவுல், Peter → பேதுரு,
  Rome → ரோம், Constantinople → கான்ஸ்டான்டிநோபிள், Jerusalem → எருசலேம், Nicaea → நிசேயா).
  For less-known names you may add the English in brackets the first time in long texts only — never in short `name`/`title` fields.
- Titles of books/works: translate descriptively; keep the original title in brackets only if the title is a famous Latin/Greek name
  (e.g. "Confessions" → "ஒப்புதல்கள் (Confessions)").
- Quotations: translate the quote's meaning faithfully into Tamil.
- Use the glossary below for consistency. If `i18n/ta/glossary-*.json` files exist, read them and use the exact Tamil
  names they give for people, traditions, doctrines, positions, eras, works and events.

## Glossary of terms
Trinity திரித்துவம் · God கடவுள் / தேவன் · Christ கிறிஸ்து · Holy Spirit பரிசுத்த ஆவி · grace கிருபை · faith விசுவாசம்
salvation இரட்சிப்பு · sin பாவம் · original sin ஆதிப் பாவம் · justification நீதிமானாக்கப்படுதல் · sanctification பரிசுத்தமாக்கப்படுதல்
atonement பாவநிவர்த்தி · incarnation மனுவுருவாதல் · resurrection உயிர்த்தெழுதல் · church திருச்சபை · denomination சபைப் பிரிவு
tradition (church family) மரபு · doctrine கோட்பாடு · theology இறையியல் · heresy வேதப்புரட்டு / திரிபுக் கொள்கை · orthodoxy மரபுவழி நம்பிக்கை
council பொதுச்சங்கம் (e.g. Council of Nicaea → நிசேயா பொதுச்சங்கம்) · creed விசுவாச அறிக்கை · confession (of faith) விசுவாச அறிக்கை
sacrament திருவருட்சாதனம் · baptism ஞானஸ்நானம் · Eucharist / Lord's Supper நற்கருணை / திருவிருந்து · Mass திருப்பலி · liturgy திருவழிபாடு
bishop ஆயர் / பிஷப் · pope போப்பாண்டவர் / திருத்தந்தை · priest குரு · pastor போதகர் · monk துறவி · monastery மடாலயம் · saint புனிதர்
Catholic கத்தோலிக்க · Orthodox ஆர்த்தடாக்ஸ் · Protestant புராட்டஸ்டன்ட் · Reformation சீர்திருத்தம் · Reformed சீர்திருத்தச் சபை
Lutheran லூத்தரன் · Anglican ஆங்கிலிக்கன் · Baptist பாப்டிஸ்ட் · Methodist மெதடிஸ்ட் · Pentecostal பெந்தெகொஸ்தே · Evangelical சுவிசேஷ
Anabaptist அனபாப்டிஸ்ட் · revival எழுப்புதல் · mission மிஷன் / நற்செய்திப் பணி · gospel நற்செய்தி / சுவிசேஷம் · scripture வேதாகமம்
Bible வேதாகமம் · Old/New Testament பழைய/புதிய ஏற்பாடு · prophecy தீர்க்கதரிசனம் · tongues அந்நியபாஷை · healing சுகமளித்தல்
vision தரிசனம் · miracle அற்புதம் · angel தேவதூதர் · demon பிசாசு / அசுத்த ஆவி · eschatology கடைசிக் காலக் கோட்பாடு
predestination முன்குறிப்பு · free will சுயாதீன சித்தம் · covenant உடன்படிக்கை · law நியாயப்பிரமாணம் · persecution துன்புறுத்தல்
martyr இரத்தசாட்சி · schism பிளவு · apostle அப்போஸ்தலர் · Church Fathers திருச்சபைத் தந்தையர் · era காலகட்டம்
AD கி.பி. · BC கி.மு. · c. (circa) சுமார்
