
const fs = require('fs');

function getKeys(obj, prefix = '') {
  let keys = [];
  for (let key in obj) {
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
      keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

const de = JSON.parse(fs.readFileSync('/locales/de.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('/locales/en.json', 'utf8'));

const deKeys = getKeys(de);
const enKeys = getKeys(en);

const onlyInDe = deKeys.filter(k => !enKeys.includes(k));
const onlyInEn = enKeys.filter(k => !deKeys.includes(k));

console.log('--- Keys only in DE ---');
console.log(onlyInDe);
console.log('--- Keys only in EN ---');
console.log(onlyInEn);
