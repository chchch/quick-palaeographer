const quickp = (function() {
    const OpenSeadragon = window.OpenSeadragon;
    const localforage = window.localforage;
    const FileSaver = window.FileSaver;
    const _state = {};
    
    const alphabet = ['oṁ','oṃ','a','ā','i','ī','u','ū','ṛ','ṝ','ḷ','ḹ','e','ē','o','ō','ai','au','ṃ','ṁ','ḥ','ḵ','k','kh','g','gh','ṅ','c','ch','j','jh','ñ','ṭ','ṭh','ḍ','ḍh','ṇ','t','th','d','dh','n','p','ph','b','bh','m','y','r','l','v','ḻ','ṟ','ṉ','ś','ṣ','s','h'].reverse();
    //const alphamax = Math.max(...alphabet.map(s => s.length));
    
    const doctitle = document.title;

    const initLoader = function() {
        document.getElementById('imgfile').addEventListener('change',loadImage);
    };

    const initViewer = function(url) {
        _state.viewer = OpenSeadragon({
            id: 'osd',
            prefixUrl: 'lib/openseadragon/images/',
            tileSources: {
                type: 'image',
                url: url,
            },
            maxZoomPixelRatio: 4,
        });
        _state.viewer.addHandler('open', () => {
            const importButton = new OpenSeadragon.Button({
                tooltip:  'Import',
                srcRest:  'images/import_rest.png',
                srcGroup: 'images/import_grouphover.png',
                srcHover: 'images/import_hover.png',
                srcDown:  'images/import_pressed.png',
                onClick: importJSON
            });
            const exportButton = new OpenSeadragon.Button({
                tooltip:  'Export',
                srcRest:  'images/export_rest.png',
                srcGroup: 'images/export_grouphover.png',
                srcHover: 'images/export_hover.png',
                srcDown:  'images/export_pressed.png',
                onClick: exportJSON
            });
            const annotationsButton = new OpenSeadragon.Button({
                tooltip:  'Show annotations',
                srcRest:  'images/annotations_rest.png',
                srcGroup: 'images/annotations_grouphover.png',
                srcHover: 'images/annotations_hover.png',
                srcDown:  'images/annotations_pressed.png',
                onClick: showAnnotations
            });
            _state.annotationsButton = annotationsButton;
            _state.viewer.addControl(annotationsButton.element, {anchor: OpenSeadragon.ControlAnchor.TOP_RIGHT});
            _state.viewer.addControl(exportButton.element, {anchor: OpenSeadragon.ControlAnchor.TOP_RIGHT});
            _state.viewer.addControl(importButton.element, {anchor: OpenSeadragon.ControlAnchor.TOP_RIGHT});
        });
        _state.anno = OpenSeadragon.Annotorious(_state.viewer, {
            widgets: [
                {widget: 'TAG'}
            ],
        });
        _state.anno.on('createAnnotation', updateAnnos);
        _state.anno.on('deleteAnnotation', updateAnnos);
        _state.anno.on('updateAnnotation', updateAnnos);

        const sidebarcontent = document.querySelector('#aksarabar #content');
        sidebarcontent.addEventListener('click',clickCrop);

        const closer = document.querySelector('#closer');
        closer.addEventListener('mouseover',mouseoverAksaraCloser.bind(null,closer));
        closer.addEventListener('mouseout',mouseoutAksaraCloser.bind(null,closer));
        
        const popup = document.querySelector('#popup');
        popup.addEventListener('click',aksaraPopup);
        popup.addEventListener('mouseover',popupMouseover.bind(null,popup));
        popup.addEventListener('mouseout',popupMouseout.bind(null,popup));
        popup.addEventListener('click',popupClick.bind(null,popup));
        
        document.title = `${_state.filename} — ${doctitle}`;
        
        localforage.length().then(n => {if(n > 0) autosaveDialog();});
    };
    
    const updateAnnos = function() {
        localforage.setItem(_state.filename,_state.anno.getAnnotations());
        if(document.getElementById('aksarabar').style.display === 'flex')
            displayCrops();
    };
    
    const autosaveDialog = function() {
        const container = document.getElementById('autosavecontainer');
        container.style.display = 'flex';
        //const div = document.getElementById('autosavediv');
        const box = document.getElementById('autosavebox');
        localforage.keys().then(ks => {
            for(const k of ks) {
                const newel = document.createElement('div');
                newel.classList.add('autosaved');
                newel.appendChild(document.createTextNode(k));
                newel.dataset.storageKey = k;
                const trashasset = document.querySelector('#assets #trash');
                const trash = document.createElement('span');
                trash.classList.add('trash');
                trash.appendChild(trashasset.cloneNode(true));
                trash.height = 20;
                newel.appendChild(trash);
                newel.addEventListener('click',loadAutosaved.bind(null,k));
                trash.addEventListener('click',removeAutosaved.bind(null,k));
                box.appendChild(newel);
            }
        });
        const cancel = document.getElementById('autosavecancel');
        cancel.addEventListener('click',cancelAutosaved);
    };
    
    const loadAutosaved = function(k,e) {
        if(e.target.tagName === 'SVG')
            return;
        localforage.getItem(k).then(i => { 
            _state.anno.setAnnotations(i);
            document.querySelector('#autosavecontainer').style.display = 'none';
        });
    };

    const removeAutosaved = function(k) {
        localforage.removeItem(k);
        const boxitem = document.querySelector(`#autosavebox .autosaved[data-storage-key='${k}']`);
        boxitem.remove();
        const leftovers = document.querySelectorAll('#autosavebox .autosaved');
        if(leftovers.length === 0)
            document.querySelector('#autosavecontainer').style.display = 'none';
    };
    
    const cancelAutosaved = function() {
        document.querySelector('#autosavecontainer').style.display = 'none';
    };

    const exportJSON = function() {
        const str = JSON.stringify(_state.anno.getAnnotations());
        const file = new Blob([str], {type: 'text/json;charset=utf-8'});
        const filenamearr = _state.filename.split('.');
        filenamearr.pop();
        const filename = filenamearr.join('');
        FileSaver(file,`${filename}-annotations.json`);
    };
   
    const showAnnotations = function() {
        _state.annotationsButton.element.style.display = 'none';
        document.getElementById('aksarabar').style.display = 'flex';
        displayCrops();
        document.getElementById('closer').addEventListener('click',closeAksaraBar);
    };

    const displayCrops = function(div,img = false,an) {
        const aksarabar = div || document.getElementById('content');
        aksarabar.innerHTML = '';
        const annos = an || _state.anno.getAnnotations();
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
                const el = img ? canvasToImg(makeCrop(t)) : makeCrop(t);
                td.appendChild(el);
            }
            tr.appendChild(td);
            table.appendChild(tr);
        }
        aksarabar.appendChild(table);
    };

    const makeCrop = function(el) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const xywh = el.target.selector.value;
        const coords = xywh.split(':')[1].split(',').map(n => parseInt(n));
        canvas.width = coords[2];
        canvas.height = coords[3];
        ctx.drawImage(_state.imgel,coords[0],coords[1],coords[2],coords[3],0,0,coords[2],coords[3]);
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

    const clickCrop = function(e) {
        if(e.target.tagName !== 'CANVAS') return;
        const annoid = e.target.dataset.annoId;
        _state.anno.selectAnnotation(annoid);
        //const point = _state.viewer.viewport.imageToViewportCoordinates(e.target.dataset.centreX,e.target.dataset.centreY);
        //_state.viewer.viewport.panTo(point);
        _state.anno.panTo(annoid);
    };
    
    const glyphSplit = function(str) {
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

    const glyphSort = function(a,b) {
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

    const mouseoverAksaraCloser = function(parel) {
        parel.querySelector('.button_hover').style.display = 'block';
    };

    const mouseoutAksaraCloser = function(parel) {
        parel.querySelector('.button_hover').style.display = 'none';
    };

    const closeAksaraBar = function() {
        _state.annotationsButton.element.style.display = 'inline-block';
        document.getElementById('aksarabar').style.display = 'none';
    };
    
    const popupMouseover = function(parel) {
        parel.querySelector('.button_hover').style.display = 'block';
    };

    const popupMouseout = function(parel) {
        parel.querySelector('.button_hover').style.display = 'none';
        parel.querySelector('.button_pressed').style.display = 'none';
    };

    const popupClick = function(parel) {
        parel.querySelector('.button_pressed').style.display = 'block';
    };

    const aksaraPopup = function() {
        const exported = {
            an: _state.anno.getAnnotations(),
            glyphSplit: glyphSplit,
            displayCrops: displayCrops,
            title: `${_state.filename} annotations`,
            FileSaver: FileSaver
        };
        const newWin = window.open('popup.html','annotations');
        newWin.imported = exported;
        newWin.onload = function() {newWin.load();};
        /*
        const newWin = window.open('about:blank','annotations');
        newWin._state = _state;
        const winload = function() {
            if(newWin.document.querySelector('table')) return;
            const title = `${_state.filename} annotations`;
            newWin.document.title = title;
            const link = newWin.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'popup.css';
            newWin.document.head.appendChild(link);
            const addDiv = newWin.document.createElement('div');
            addDiv.className = 'topmenu';
            addDiv.append('append annotations ');
            const addButton = newWin.document.createElement('input');
            addButton.type = 'file';
            addButton.accept = '.html,text/html';
            addDiv.append(addButton);
            newWin.document.body.appendChild(addDiv);
            addButton.addEventListener('change',appendAnnotations.bind(null,newWin));
            const header = newWin.document.createElement('h2');
            header.appendChild(newWin.document.createTextNode(title));
            newWin.document.body.appendChild(header);
            const contentbox = newWin.document.createElement('div');
            displayCrops(contentbox,true);
            newWin.document.body.appendChild(contentbox);
            newWin.getComputedStyle(newWin.document.querySelector('table'));
        };
        newWin.addEventListener('load',winload);
        newWin.focus();
        newWin.setTimeout(winload,1000);
        */
    };
    /*
    const appendAnnotations = function(w,e) {
        const f = e.target.files[0];

        const targDoc = w.document;

        const loadHTMLAnnos = function(e) {
            const domtree = (new DOMParser()).parseFromString(e.target.result,'text/html');

            const oldh2 = targDoc.querySelector('h2');
            const newh2 = domtree.querySelector('h2');
            if(newh2) {
                oldh2.appendChild(document.createElement('br'));
                oldh2.append(newh2.textContent);
            }

            const newrows = domtree.querySelectorAll('tr');
            const table = targDoc.querySelector('table');
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
*/
    const importJSON = function() {
        const loadFile = function(e) {
            const f = e.target.files[0];
            const reader = new FileReader();
            reader.onload = loadAnnoString;
            reader.readAsText(f);
        };
        const loadAnnoString = function(e) {
            const jj = JSON.parse(e.target.result);
            //_state.anno.setAnnotations(jj); 
            for(const j of jj)
                _state.anno.addAnnotation(j);
            updateAnnos();
        };
        const input = document.createElement('input');
        input.type = 'file';
        input.addEventListener('change',loadFile,false);
        input.click();
    };
    
    const loadImage = function(e) {
        const loadImageSrc = function(e) {
            const imgel = document.createElement('img');
            imgel.src = e.target.result;
            _state.imgel = imgel;
            initViewer(imgel.src);
        };

        const f = e.target.files[0];
        _state.filename = f.name;
        const reader = new FileReader();
        reader.onload = loadImageSrc;
        reader.readAsDataURL(f);
        document.getElementById('opendiv').style.display = 'none';            
    };

    return {
        initLoader: initLoader,
        initViewer: initViewer,
    };

})();
window.addEventListener('load',quickp.initLoader);
