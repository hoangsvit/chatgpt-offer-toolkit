import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Rasterize the geometric design in public/icon.svg at browser icon sizes.
// Supersampling keeps the ticket and percent symbol legible at 16px.
const output = fileURLToPath(new URL('../public/icon/', import.meta.url));
mkdirSync(output, { recursive: true });
const green = [20,109,75,255], white = [255,255,255,255], clear = [0,0,0,0];
function circle(x,y,cx,cy,r) { return (x-cx)**2+(y-cy)**2 <= r*r; }
function stroke(x,y) {
  const t = Math.max(0,Math.min(1,((x-49)*30+(y-79)*-30)/1800));
  return circle(x,y,49+30*t,79-30*t,4);
}
function sample(x,y) {
  const dx = Math.max(32-x,0,x-96), dy = Math.max(32-y,0,y-96);
  if(x<4||x>124||y<4||y>124||dx*dx+dy*dy>28*28) return clear;
  const ticket = x>=24&&x<=104&&y>=37&&y<=91&&!circle(x,y,24,64,11)&&!circle(x,y,104,64,11);
  if(!ticket) return green;
  return circle(x,y,50,51,6)||circle(x,y,78,78,6)||stroke(x,y)?green:white;
}
function crc32(buffer) {
  let crc=0xffffffff;
  for(const b of buffer) {
    crc^=b;
    for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data) {
  const body=Buffer.concat([Buffer.from(type),data]);
  const header=Buffer.alloc(4), footer=Buffer.alloc(4);
  header.writeUInt32BE(data.length);footer.writeUInt32BE(crc32(body));
  return Buffer.concat([header,body,footer]);
}
for(const size of [16,32,48,96,128]) {
  const pixels=Buffer.alloc((size*4+1)*size);
  const step=128/size, n=4;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    let r=0,g=0,b=0,a=0;
    for(let sy=0;sy<n;sy++) for(let sx=0;sx<n;sx++) {
      const c=sample((x+(sx+.5)/n)*step,(y+(sy+.5)/n)*step);
      r+=c[0]*c[3];g+=c[1]*c[3];b+=c[2]*c[3];a+=c[3];
    }
    const offset=y*(size*4+1)+1+x*4;
    pixels[offset]=a?Math.round(r/a):0;pixels[offset+1]=a?Math.round(g/a):0;pixels[offset+2]=a?Math.round(b/a):0;pixels[offset+3]=Math.round(a/(n*n));
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  writeFileSync(output+size+'.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
console.log('Generated extension icons: 16, 32, 48, 96, 128px');
