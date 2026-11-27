import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const [tag, file] = process.argv.slice(2);
if (!/^v\d+\.\d+\.\d+$/.test(tag) || !file) throw new Error('Expected release tag and signed XPI path');
const version = tag.slice(1);
const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
console.log(JSON.stringify({addons:{'chatgpt-offer-toolkit@eplus.dev':{updates:[{version,update_link:'https://github.com/hoangsvit/chatgpt-offer-toolkit/releases/download/'+tag+'/chatgpt-offer-toolkit-'+version+'-firefox.xpi',update_hash:'sha256:'+hash}]}}},null,2));
