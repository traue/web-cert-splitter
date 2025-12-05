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
  const splitFolders   = byId('splitFolders');
  const columnFolderSelect = byId('columnFolderSelect');
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
  let selectedFolderColumn = null;

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
  splitFolders.addEventListener('change', ()=>{
    columnFolderSelect.disabled = !splitFolders.checked;
    buildMappingPreview();
    maybeEnableBuild();
  });
  columnFolderSelect.addEventListener('change', ()=>{
    selectedFolderColumn = columnFolderSelect.value || null;
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

    // Popular columnFolderSelect
    columnFolderSelect.innerHTML='';
    columns.forEach((h)=>{
      const opt = document.createElement('option');
      opt.value = h; opt.textContent = h;
      columnFolderSelect.appendChild(opt);
    });
    selectedFolderColumn = columns[1] || columns[0] || null;
    columnFolderSelect.value = selectedFolderColumn || '';
    columnFolderSelect.disabled = !splitFolders.checked || columns.length === 0;

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
    const folderOptions = rows.map(r => (selectedFolderColumn ? (r[selectedFolderColumn] || '') : '') );

    for(let i=0;i<nOut;i++){
      const row = document.createElement('div');
      row.className = 'map-row';

      const left = document.createElement('div');
      const folderBadge = splitFolders.checked ? `<span class=\"badge\" style=\"margin-left:8px\">Pasta: ${folderOptions[i] || '(raiz)'}<\/span>` : '';
      left.innerHTML = `<span class=\"badge\">Certificado #${i+1}<\/span>${folderBadge}`;

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
    const baseOk = !!(pdfDoc && computeOutputCount() > 0 && rows.length > 0 && selectedNameColumn);
    const folderOk = !splitFolders.checked || !!selectedFolderColumn;
    buildBtn.disabled = !(baseOk && folderOk);
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
      const folderValues = rows.map(r => (selectedFolderColumn ? (r[selectedFolderColumn] || '') : ''));
      // Copiar páginas por blocos
      for(let i=0; i<outputCount; i++){
        const start = i * n;
        const end = Math.min(start + n, totalPages);
        const newPdf = await PDFLib.PDFDocument.create();
        const pagesToCopy = await newPdf.copyPages(pdfDoc, Array.from({length:end-start}, (_,k)=> start+k));
        pagesToCopy.forEach(p => newPdf.addPage(p));
        const bytes = await newPdf.save();
        const fname = sanitize(filenames[i]) + '.pdf';
        if(splitFolders.checked){
          const folderName = sanitize(folderValues[i] || 'sem-pasta');
          zip.folder(folderName).file(fname, bytes);
        } else {
          zip.file(fname, bytes);
        }
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

  // Accordion toggle (mantém compatível com resto do app)
  (function(){
    const toggle = document.querySelector('.accordion-toggle');
    if (!toggle) return;

    const panel = document.getElementById(toggle.getAttribute('aria-controls'));

    function setCollapsed(collapsed){
      toggle.setAttribute('aria-expanded', String(!collapsed));
      // adjust max-height via attribute+CSS rules; keep panel accessible
      if (collapsed){
        panel.style.maxHeight = '0';
      } else {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    }

    // initialize (respecta atributo inicial)
    const initiallyExpanded = toggle.getAttribute('aria-expanded') === 'true';
    if (!initiallyExpanded) panel.style.maxHeight = '0';
    else panel.style.maxHeight = panel.scrollHeight + 'px';

    toggle.addEventListener('click', function(){
      const collapsed = toggle.getAttribute('aria-expanded') === 'true';
      setCollapsed(collapsed);
    });

    // recompute height on window resize (para conteúdo dinâmico)
    window.addEventListener('resize', function(){
      if (toggle.getAttribute('aria-expanded') === 'true'){
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  })();

})();