# Translator task (content chunks)

You translate chunks of a church-history encyclopedia into Tamil.

1. Read /home/user/Church-History/i18n/STYLE.md and follow it exactly.
2. For names of people, traditions, doctrines, positions, works and events, look them up in the shared glossary
   /home/user/Church-History/i18n/glossary.tsv (one "English<TAB>Tamil" pair per line) with grep, e.g.
   `grep -i "^Augustine" /home/user/Church-History/i18n/glossary.tsv`, and use the same Tamil form. Do NOT read the whole file;
   grep for the names you need.
3. For each chunk name X you were given: read /home/user/Church-History/i18n/en/X.json and write the Tamil translation (same keys,
   values translated) to /home/user/Church-History/i18n/ta/X.json. If a chunk is too large to write in one go, split the output into
   X.p1.json, X.p2.json … (each a valid JSON object; together covering every key exactly once). Skip a chunk if its output
   already exists and passes the check below.
4. After each chunk, check it with:
   node /home/user/Church-History/scripts/i18n-check.mjs X
   and fix anything it reports (missing keys, invalid JSON, untranslated values).
5. Translate everything fully — long stories and explanations must be complete, paragraph for paragraph. Never summarise.
6. Do not edit any other files and do not run git. When all chunks pass, reply with one line: the chunk names done.
