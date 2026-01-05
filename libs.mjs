const alphabet = ['oṁ','oṃ','a','ā','i','ī','u','ū','ṛ','ṝ','ḷ','ḹ','e','ē','o','ō','ai','au','ṃ','ṁ','ḥ','ḵ','k','kh','g','gh','ṅ','c','ch','j','jh','ñ','ṭ','ṭh','ḍ','ḍh','ṇ','t','th','d','dh','n','p','ph','b','bh','m','y','r','l','v','ḻ','ṟ','ṉ','ś','ṣ','s','h'].reverse();
//const alphamax = Math.max(...alphabet.map(s => s.length));

const glyphSplit = str => {
    const ret = [];
    var test = str;
    const testSlice = function(s) {
        var copy = s;
        while(copy.length > 0) {
            if(alphabet.includes(copy))
                return copy;
            else
                copy = copy.substr(0,copy.length-1);
        }
        return s.substr(0,1);
    };
    
    while(test.length > 0) {
        const slice = test.substr(0,2);
        const result = testSlice(slice);
        ret.push(result);
        test = test.slice(result.length);
    }
    return ret;
};

const glyphSort = (a,b) => {
    const asplit = glyphSplit(a);
    const bsplit = glyphSplit(b);
    const max = Math.max(asplit.length,bsplit.length);
    for(let n=0;n<max;n++) {
        const apos = alphabet.indexOf(asplit[n]);
        const bpos = alphabet.indexOf(bsplit[n]);
        if(apos > bpos) return -1;
        else if(apos < bpos) return 1;
    }
    if(a.length < b.length) return -1;
    else return 1;
};

const displayCrops = (imgel,div,img = false,an = null) =>  {
  const aksarabar = div;
  aksarabar.innerHTML = '';
  const annos = an;
  const taglist = new Map();
  for(const a of annos) {
      const tags = a.body.filter(t => t.purpose === 'tagging');
      for(const t of tags) {
          const val = t.value.trim();
          if(taglist.has(val)) {
              const arr = taglist.get(val);
              arr.push(a);
              taglist.set(val,arr);
          }
          else {
              taglist.set(val,[a]);
          }
      }
  }
  const table = document.createElement('table');
  const sorted = [...taglist.keys()].sort(glyphSort);
  for(const s of sorted) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.appendChild(document.createTextNode(s));
      tr.appendChild(th);
      const td = document.createElement('td');
      for(const t of taglist.get(s)) {
          const el = img ? canvasToImg(makeCrop(t,imgel)) : makeCrop(t,imgel);
          td.appendChild(el);
      }
      tr.appendChild(td);
      table.appendChild(tr);
  }
  aksarabar.appendChild(table);
};

const makeCrop = function(el,imgel) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const xywh = el.target.selector.value;
    const coords = xywh.split(':')[1].split(',').map(n => parseInt(n));
    canvas.width = coords[2];
    canvas.height = coords[3];
    console.log(imgel);
    ctx.drawImage(imgel,coords[0],coords[1],coords[2],coords[3],0,0,coords[2],coords[3]);
    canvas.dataset.annoId = el.id;
    canvas.dataset.centreX = coords[0] + coords[2]/2;
    canvas.dataset.centreY = coords[1] + coords[3]/2;
    return canvas;
};

const canvasToImg = function(c) {
    const url = c.toDataURL();
    const i = document.createElement('img');
    i.src = url;
    return i;
};

export { displayCrops, glyphSort, glyphSplit };
