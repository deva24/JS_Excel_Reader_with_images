
module Lib
{
    type fieldEffect = { [key: string]: string | number | Array<{ [key: string]: string | number }> };

    function getMode(fileName: string): 'string' | 'arraybuffer'
    {
        if (fileName == 'word/document.xml')
            return 'string';
        else
            return 'arraybuffer';
    }

    function getCompresion(fileName: string): "DEFLATE" | "STORE"
    {
        if (fileName.endsWith('.xml'))
            return "DEFLATE";

        if (fileName.endsWith('.rels'))
            return "DEFLATE";

        return "STORE";
    }

    export class Processor
    {
        Files: { [name: string]: ArrayBuffer | string };

        async process(ab: ArrayBuffer, fields: { [key: string]: string }): Promise<ArrayBuffer>
        {
            return new Promise<ArrayBuffer>(async (res, rej) =>
            {
                await this.deProcess(ab);

                this.setFieldValues(fields);

                var ret = await this.reProcess();

                res(ret);
            });
        }

        private setFieldValues(fields: fieldEffect)
        {
            var text = this.Files['word/document.xml'] as string;
            if(text.charAt(0)!=='<')text = text.substring(1,text.length);
            var xmlParser = new DOMParser();
            var dom = xmlParser.parseFromString(text, 'text/xml');
            this.setValuesRecursively(dom, fields);

            var xs = new XMLSerializer();
            var text = xs.serializeToString(dom);

            var ret = dom.querySelector('body');
            this.Files['word/document.xml'] = text;
        }

        private setValuesRecursively(k: Element | Document, fields: fieldEffect)
        {
            var filter = /\{([@#$])(\w+)\=?\w*?\}/;

            var goIn = false;
            var txt: string | null = '';


            if (k.localName === 'p')
            {
                goIn = true;
                txt = k.textContent;
            }

            if (goIn)
            {
                if (txt == null) return;
                var verbs = txt.split(filter);

                if (verbs.length == 1) return;
                if (verbs.indexOf('#') == -1)
                {
                    // Token Replacer Code
                    var allTs = k.querySelectorAll('t');
                    var acc = '';
                    for (i = 0; i < allTs.length; i++)
                    {
                        var t = allTs.item(i);
                        if (!t.firstChild) continue;
                        if (t.firstChild.nodeType == t.TEXT_NODE)
                        {
                            acc += t.firstChild.textContent;
                        }
                    }

                    var replaceQueue = [] as { pos: number, len: number, val: string }[];



                    Object.keys(fields).forEach(key =>
                    {
                        var value = fields[key];

                        if (typeof value === 'number') value = value.toString();
                        if (typeof value !== 'string') value = '';

                        var find = '{@' + key + '}';
                        var lastKnownIndex = -1;

                        while (true)
                        {
                            var ind = acc.indexOf(find, lastKnownIndex);
                            if (ind == -1) break;
                            lastKnownIndex = ind + find.length;

                            if (ind >= 0)
                            {
                                replaceQueue.push({
                                    pos: ind,
                                    len: find.length,
                                    val: value
                                });
                            }
                        }
                    });

                    var props = {
                        cellcolor: function (elem: Element, value: string)
                        {
                            try
                            {
                                debugger;
                                var cellElem = elem.parentElement;
                                while(cellElem.localName!='tc' && cellElem.parentElement)cellElem=cellElem.parentElement;
                                if(cellElem==null)return;

                                var cellStyleElem = cellElem.querySelector('tcPr');
                                if(cellStyleElem==null)return;

                                var shader = cellStyleElem.querySelector('shd');
                                if(shader)
                                {
                                    cellStyleElem.removeChild(shader);
                                }
                                var shaderDescriptor = `<w:shd w:val="clear" w:color="auto" w:fill="${value}"/>`;
                                cellStyleElem.innerHTML += shaderDescriptor;
                            }
                            catch(ex)
                            {

                            }

                            
                        }
                    };

                    Object.keys(props).forEach(key =>
                    {
                        var lookFor = new RegExp('\\{\\$' + key + '\\=(\\w+?)\\}', 'g');
                        while (true)
                        {
                            var sr = lookFor.exec(acc);
                            if (sr == null) break;

                            replaceQueue.push({
                                pos: sr.index,
                                len: sr[0].length,
                                val: ''
                            });

                            var valSponsor = sr[1];
                            var value = fields[valSponsor];
                            if(value=='')continue;
                            if(value==null)continue;

                            props[key](k,value);
                            
                        }
                    });

                    replaceQueue.sort((a, b) =>
                    {
                        if (a.pos < b.pos) return -1;
                        if (a.pos > b.pos) return 1;
                        return 0;
                    });

                    for (i = replaceQueue.length - 1; i >= 0; i--)
                    {
                        ReplaceInXML(allTs, replaceQueue[i].pos, replaceQueue[i].len, replaceQueue[i].val)
                    }

                    function ReplaceInXML(xmls: NodeListOf<Element>, start: number, len: number, replace: string)
                    {
                        var counter = 0;
                        var isFirst = true;
                        var gcc = '';
                        for (var j = 0; j < xmls.length; j++)
                        {
                            var xElem = xmls.item(j);
                            var tc = xElem.textContent
                            gcc += tc;

                            if (counter + tc.length <= start)
                            {
                                counter += tc.length;
                                continue;
                            }

                            if (counter + tc.length > start)
                            {
                                var removeFrom = start - counter;
                                var removeTill = Math.min(removeFrom + len, tc.length);

                                var left = tc.substring(0, removeFrom);
                                var right = tc.substring(removeTill, tc.length);

                                if (isFirst)
                                    tc = left + replace + right;
                                else
                                    tc = left + right;

                                counter += removeTill;

                                xElem.textContent = tc;
                                isFirst = false;
                            }

                        }
                    }

                    // End Replacer
                }
                else
                {
                    let i = 0;
                    let dataK: any;
                    let typeK: string;
                    // Remove # keys process
                    var ind1 = verbs.indexOf('#');
                    let fldVar = verbs[ind1 + 1];
                    var findAndRemove = `{#${verbs[ind1 + 1]}}`;

                    var skipchars = txt.indexOf(findAndRemove);
                    var skipLen = findAndRemove.length;

                    var textContainer = k.querySelectorAll('r>t');

                    var len = textContainer.length;
                    for (i = 0; i < len; i++)
                    {
                        let tc = textContainer.item(i);
                        let textC = tc.textContent as string;

                        if (!textC) continue;
                        if (textC.length < skipchars) skipchars -= textC.length;

                        if (textC.length > skipchars)
                        {
                            for (var j = 0; j < textC.length; j++)
                            {
                                if (j >= skipchars && skipLen > 0)
                                {
                                    var left = textC.substring(0, j);
                                    var right = textC.substring(j + 1, textC.length);
                                    textC = left + right;
                                    j--;
                                    skipchars--;
                                    skipLen--;
                                }
                            }
                        }
                        tc.textContent = textC;
                        if (textC == '')
                        {
                            let rElem = tc.parentElement;
                            if (rElem)
                            {
                                k.removeChild(rElem);
                            }
                        }
                    }
                    // End Region

                    // Find RowElem
                    let parentElem = k.parentElement as Element;
                    while (parentElem && parentElem.localName != 'tr') parentElem = parentElem.parentElement as Element;
                    if (!parentElem) return;
                    let rowElem = parentElem;
                    // End Region

                    // TableRow repeater code
                    parentElem = rowElem.parentElement as Element;
                    parentElem.removeChild(rowElem);

                    let listing = fields[fldVar];
                    if (!(listing instanceof Array) || listing.length == 0) return;

                    for (i = 0; i < listing.length; i++)
                    {
                        let sourceItem = listing[i];

                        let itemClone = rowElem.cloneNode(true) as Element;
                        this.setValuesRecursively(itemClone, sourceItem);
                        parentElem.appendChild(itemClone);
                    }

                    // End Region
                }
            }
            else
            {
                var len = k.childNodes.length;
                for (var i = 0; i < len; i++)
                {
                    var nodeN = k.childNodes.item(i) as Element;
                    this.setValuesRecursively(nodeN, fields);
                }
            }
        }

        private async deProcess(ab: ArrayBuffer): Promise<void>
        {
            this.Files = {};
            return new Promise<void>((res1, rej1) =>
            {
                var k = new JSZip();
                k.loadAsync(ab).then(() =>
                {

                    let arr = Object.keys(k.files);
                    let sy = 0;
                    arr.forEach(fileName =>
                    {
                        var mode = getMode(fileName);

                        k.files[fileName].async(mode).then((res) =>
                        {
                            this.Files[fileName] = res;
                            sy++;
                            if (sy == arr.length)
                                res1();
                        }).catch(res =>
                        {

                            throw { message: "Error" };
                        });
                    });
                });
            });
        }

        private async reProcess(): Promise<ArrayBuffer>
        {
            return new Promise<ArrayBuffer>((res, rej) =>
            {
                var k = new JSZip();
                Object.keys(this.Files).forEach(fileName =>
                {
                    var data = this.Files[fileName];

                    let comp1 = getCompresion(fileName);
                    k.file(fileName, data, { compression: comp1 });
                });

                k.generateAsync({ type: 'blob' }).then((bl: ArrayBuffer) =>
                {
                    res(bl);
                });

            });
        }
    }
}



async function test(ab: ArrayBuffer, fld: any)
{

    var k = new Lib.Processor();
    var op = await k.process(ab, fld);


    var url = URL.createObjectURL(op);
    var a = ak;
    a.href = url;
    a.download = 'File1.docx';
    a.target = '_blank';
    a.innerText = 'Test ' + (counter++);
}

var ak: HTMLAnchorElement;
var counter = 1;
module UI
{

    export function init()
    {
        document.body.innerHTML = `<input type='file'/><button>Runner</button><textarea></textarea><a></a>`;

        let inp = document.querySelector(`input`) as HTMLInputElement;
        let btn = document.querySelector('button') as HTMLButtonElement;
        let txa = document.querySelector('textarea') as HTMLTextAreaElement;
        ak = document.querySelector('a') as HTMLAnchorElement;

        btn.onclick = function ()
        {
            if (inp.files && inp.files.length > 0)
            {
                let fr = new FileReader();
                fr.readAsArrayBuffer(inp.files[0]);
                fr.onload = function ()
                {
                    var js = `(function(){ return {${txa.value}} })();`;
                    var fld = eval(js);

                    test(fr.result, fld);
                }
            }
        }
    }
}

document.onreadystatechange = function ()
{
    if (document.readyState == "complete")
    {
        UI.init();
        //Change
    }
}
