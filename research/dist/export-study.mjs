export async function makeWord(title, text, references = []) {
  const {Document, Paragraph, TextRun, FootnoteReferenceRun, HeadingLevel, Packer, Table, TableRow, TableCell} = await import('./vendor/docx.mjs');
  const para = (value, heading) => new Paragraph({bidirectional:true, alignment:'right', heading,
    children:[new TextRun({text:value,rightToLeft:true})]});
  const children = [para(title || 'یادداشت پژوهشی', HeadingLevel.TITLE)];
  const footnotes = {};
  const lines=text.split('\n');
  const cells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim());
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(/^\s*\|.*\|\s*$/.test(line)&&index+1<lines.length&&cells(lines[index+1]).every(s=>/^:?-{3,}:?$/.test(s))){
      const data=[cells(line)];index++;
      while(index+1<lines.length&&/^\s*\|.*\|\s*$/.test(lines[index+1]))data.push(cells(lines[++index]));
      const width=Math.max(...data.map(row=>row.length));children.push(new Table({visuallyRightToLeft:true,rows:data.map((row,i)=>new TableRow({tableHeader:i===0,children:Array.from({length:width},(_,j)=>new TableCell({children:[para(row[j]||'')]}))}))}));
      continue;
    }
    if (line.startsWith('منبع:') && line.slice(5).trim()) {
      const ref=line.slice(5).trim(), id=Object.keys(footnotes).length+1;
      footnotes[id]={children:[para(ref)]};
      children.push(new Paragraph({bidirectional:true,children:[new TextRun({text:'منبع',rightToLeft:true}),new FootnoteReferenceRun(id)]}));
      continue;
    }
    const match = /^(#{1,3})\s+(.*)$/.exec(line);
    children.push(para(match ? match[2] : line, match && [null,HeadingLevel.HEADING_1,HeadingLevel.HEADING_2,HeadingLevel.HEADING_3][match[1].length] || undefined));
  }
  if (references.length) children.push(para('منابع',HeadingLevel.HEADING_1));
  for(const ref of new Set(references)) children.push(para(ref));
  return Packer.toBlob(new Document({footnotes,sections:[{children}]}));
}
export async function saveBinary(name,blob) {
  if (!blob) throw Error('فایل ساخته نشد.');
  if (window.MansourAndroid) {
    const reader=new FileReader();
    const encoded=await new Promise((ok,fail)=>{reader.onload=()=>ok(reader.result.split(',')[1]);reader.onerror=fail;reader.readAsDataURL(blob)});
    window.MansourAndroid.saveDocument(name,encoded,blob.type);
  } else {
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),30000);
  }
}
