import { displayCrops, glyphSort } from './libs.mjs';

const load = imported => {
    //const imported = window.imported;
    const an = imported.an;
    const imgel = document.createElement('img');
    imgel.src = URL.createObjectURL(imported.imgblob);

    document.getElementById('savebutton').addEventListener('click',saveAnnotations);
    document.getElementById('addbutton').addEventListener('change',appendAnnotations);
    document.getElementById('addtext').addEventListener('click',function() {
        document.getElementById('addbutton').click();
    });
    const header = document.querySelector('h2');
    header.append(imported.title);

    imgel.addEventListener('load', e => displayCrops(imgel,document.getElementById('content'),true,an));
};

const saveAnnotations = function() {
   const docclone = document.cloneNode(true);
   docclone.querySelector('script').remove();
   docclone.querySelector('.topmenu').remove();
   //const serializer = new XMLSerializer();
   //const str = serializer.serializeToString(docclone);
   const str = docclone.documentElement.outerHTML;
   const file = new Blob([str],{type: 'text/html;charset=utf-8'});
   FileSaver(file,`${imported.title}.html`);
};

const appendAnnotations = function(e) {
    const f = e.target.files[0];

    const loadHTMLAnnos = function(e) {
        const domtree = (new DOMParser()).parseFromString(e.target.result,'text/html');

        const oldh2 = document.querySelector('h2');
        const newh2 = domtree.querySelector('h2');
        if(newh2) {
            oldh2.appendChild(document.createElement('br'));
            oldh2.append(newh2.textContent);
        }

        const newrows = domtree.querySelectorAll('tr');
        const table = document.querySelector('table');
        const oldrows = new Map(
            [...table.querySelectorAll('tr')].map(r => {
                const th = r.querySelector('th').textContent;
                const td = r.querySelector('td');
                return [th,td];
            })
        );
        for(const n of newrows) {
            const th = n.querySelector('th').textContent;
            const td = n.querySelector('td');
            if(oldrows.has(th)) {
                const par = oldrows.get(th);
                while(td.firstChild)
                    par.appendChild(td.firstChild);
            }
            else {
                table.appendChild(n);
            }
        }
        const allrows = new Map(
            [...table.querySelectorAll('tr')].map(r => {
                const th = r.querySelector('th').textContent;
                return [th,r];
            })
        );
        const sorted = [...allrows.keys()].sort(glyphSort);
        for(const s of sorted)
            table.appendChild(allrows.get(s));
    };

    const reader = new FileReader();
    reader.onload = loadHTMLAnnos;
    reader.readAsText(f);
};
const bc = new BroadcastChannel('quick_palaeographer');
bc.onmessage = e => load(e.data);
bc.postMessage('popup-ready');

