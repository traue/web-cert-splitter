// App: Divisor de Certificados
// Requisitos: pdf-lib, xlsx (SheetJS), JSZip, FileSaver
(function(){
  const byId = (id)=>document.getElementById(id);

  const pdfInput       = byId('pdfInput');
  const xlsxInput      = byId('xlsxInput');
  const pdfInfo        = byId('pdfInfo');
  const xlsxInfo       = byId('xlsxInfo');
  const pagesPerSplit  = byId('pagesPerSplit');
  const sheetSelect    = byId('sheetSelect');
  const columnSelect   = byId('columnSelect');
  const mappingArea    = byId('mappingArea');
  const buildBtn       = byId('buildBtn');
  const resetBtn       = byId('resetBtn');
  const statusEl       = byId('status');

  let pdfBytes = null;
  let pdfDoc   = null;
  let totalPages = 0;

  let workbook = null;
  let sheetNames = [];
  let rows = []; // array of objects
  let columns = []; // column headers
  let selectedNameColumn = null;

  let mapping = []; // [{index, selectEl}]

  function setStatus(msg, type=''){
    statusEl.textContent = msg;
    statusEl.className = 'status ' + (type || '');
  }

  function reset(){
    pdfBytes = null; pdfDoc = null; totalPages = 0;
    workbook = null; sheetNames = []; rows = []; columns = []; selectedNameColumn = null;
    mapping = [];
    pdfInput.value = ''; xlsxInput.value = ''; pagesPerSplit.value = 1;
    sheetSelect.innerHTML = ''; sheetSelect.disabled = true;
    columnSelect.innerHTML = ''; columnSelect.disabled = true;
    mappingArea.innerHTML = '';
    pdfInfo.textContent = ''; xlsxInfo.textContent = '';
    buildBtn.disabled = true;
    setStatus('');
  }

  resetBtn.addEventListener('click', reset);

  // PDF loader
  pdfInput.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if(!file){ pdfInfo.textContent = ''; return; }
    const arr = await file.arrayBuffer();
    pdfBytes = new Uint8Array(arr);
    try{
      pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
      totalPages = pdfDoc.getPageCount();
      pdfInfo.innerHTML = `<strong>OK!</strong> Páginas totais: ${totalPages}`;
    }catch(err){
      console.error(err);
      pdfInfo.innerHTML = `<span class="error">Falha ao ler PDF.</span>`;
    }
    maybeEnableBuild();
    buildMappingPreview();
  });

  // XLSX loader
  xlsxInput.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if(!file){ xlsxInfo.textContent=''; return; }
    const arr = await file.arrayBuffer();
    try{
      workbook = XLSX.read(arr, {type:'array'});
      sheetNames = workbook.SheetNames || [];
      xlsxInfo.innerHTML = `<strong>OK!</strong> Abas encontradas: ${sheetNames.length}`;
      // Popular sheetSelect
      sheetSelect.innerHTML = '';
      sheetNames.forEach((name,i)=>{
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = `${i+1}. ${name}`;
        sheetSelect.appendChild(opt);
      });
      sheetSelect.disabled = false;
      loadSheet(sheetNames[0]);
    }catch(err){
      console.error(err);
      xlsxInfo.innerHTML = `<span class="error">Falha ao ler XLSX.</span>`;
    }
  });

  sheetSelect.addEventListener('change', ()=>loadSheet(sheetSelect.value));
  columnSelect.addEventListener('change', ()=>{
    selectedNameColumn = columnSelect.value || null;
    buildMappingPreview();
    maybeEnableBuild();
  });
  pagesPerSplit.addEventListener('input', ()=>{
    buildMappingPreview();
    maybeEnableBuild();
  });

  function loadSheet(name){
    const ws = workbook.Sheets[name];
    // Ao usar header:1, obtemos as linhas puras para extrair cabeçalhos realistas
    const rowsRaw = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    if(!rowsRaw.length){
      rows = []; columns = [];
    } else {
      columns = rowsRaw[0].map((h,idx)=> String(h||`Coluna ${idx+1}`));
      // Converter demais linhas para objetos alinhados aos headers
      rows = rowsRaw.slice(1).map(r=>{
        const obj = {};
        columns.forEach((h,idx)=> obj[h] = (r[idx] ?? '').toString().trim());
        return obj;
      });
    }
    // Popular columnSelect
    columnSelect.innerHTML='';
    columns.forEach((h)=>{
      const opt = document.createElement('option');
      opt.value = h; opt.textContent = h;
      columnSelect.appendChild(opt);
    });
    selectedNameColumn = columns[0] || null;
    columnSelect.value = selectedNameColumn || '';
    columnSelect.disabled = columns.length === 0;

    xlsxInfo.innerHTML += `<br/><strong>Linhas:</strong> ${rows.length} | <strong>Colunas:</strong> ${columns.length}`;

    buildMappingPreview();
    maybeEnableBuild();
  }

  function computeOutputCount(){
    const n = parseInt(pagesPerSplit.value || '1', 10);
    if(!pdfDoc || !totalPages || !n || n < 1) return 0;
    return Math.ceil(totalPages / n);
  }

  function buildMappingPreview(){
    mappingArea.innerHTML = '';
    mapping = [];

    const nOut = computeOutputCount();
    if(!nOut) return;

    const label = document.createElement('div');
    label.className = 'help';
    label.textContent = `Serão gerados ${nOut} PDF(s). Configure o nome de cada um:`;
    mappingArea.appendChild(label);

    // Opções de nomes (em ordem da planilha)
    const nameOptions = rows.map(r => (selectedNameColumn ? (r[selectedNameColumn] || '') : '') );

    for(let i=0;i<nOut;i++){
      const row = document.createElement('div');
      row.className = 'map-row';

      const left = document.createElement('div');
      left.innerHTML = `<span class="badge">Certificado #${i+1}</span>`;

      const right = document.createElement('div');
      const select = document.createElement('select');
      select.style.width = '100%';
      // popular
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '(Selecione um nome)';
      select.appendChild(placeholder);

      nameOptions.forEach((name, idx)=>{
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name || `(linha ${idx+2} sem valor)`;
        select.appendChild(opt);
      });

      // seleção padrão: a i-ésima linha, se existir
      if(nameOptions[i]) select.value = nameOptions[i];

      right.appendChild(select);
      row.appendChild(left);
      row.appendChild(right);

      mappingArea.appendChild(row);
      mapping.push({index:i, selectEl: select});
    }
  }

  function maybeEnableBuild(){
    const ok = !!(pdfDoc && computeOutputCount() > 0 && rows.length > 0 && selectedNameColumn);
    buildBtn.disabled = !ok;
  }

  buildBtn.addEventListener('click', async ()=>{
    try{
      setStatus('Gerando PDFs... isto pode levar alguns segundos.');
      const n = parseInt(pagesPerSplit.value || '1', 10);
      const outputCount = computeOutputCount();
      if(!outputCount) throw new Error('Configuração inválida.');

      // Verificar se todos os selects possuem um nome
      const filenames = mapping.map(m => (m.selectEl.value || '').trim());
      if(filenames.some(nm => !nm)){
        setStatus('Selecione um nome para todos os certificados.', 'error');
        return;
      }

      // Sanitização leve do nome de arquivo
      const sanitize = (s)=>s.replace(/[\\/:*?"<>|]+/g,'-').trim() || 'sem-nome';

      const zip = new JSZip();
      // Copiar páginas por blocos
      for(let i=0; i<outputCount; i++){
        const start = i * n;
        const end = Math.min(start + n, totalPages);
        const newPdf = await PDFLib.PDFDocument.create();
        const pagesToCopy = await newPdf.copyPages(pdfDoc, Array.from({length:end-start}, (_,k)=> start+k));
        pagesToCopy.forEach(p => newPdf.addPage(p));
        const bytes = await newPdf.save();
        const fname = sanitize(filenames[i]) + '.pdf';
        zip.file(fname, bytes);
      }

      setStatus('Compactando arquivos...');
      const blob = await zip.generateAsync({type:'blob'});
      saveAs(blob, 'certificados-divididos.zip');
      setStatus('Pronto! ZIP baixado com sucesso ✅', 'success');
    }catch(err){
      console.error(err);
      setStatus('Erro ao gerar PDFs. Verifique os arquivos e as configurações.', 'error');
    }
  });

})();