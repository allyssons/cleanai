(() => {
  const byId = id => document.getElementById(id);
  const input = byId('officeFile');
  const choose = byId('officeChoose');
  const analyze = byId('officeAnalyze');
  const clean = byId('officeClean');
  const reset = byId('officeReset');
  const selected = byId('officeSelected');
  const fileName = byId('officeFileName');
  const fileSize = byId('officeFileSize');
  const results = byId('officeResults');
  const fieldList = byId('officeFields');
  const status = byId('officeStatus');
  const MAX_SIZE = 15 * 1024 * 1024;
  const commonFields = {
    'docProps/core.xml': new Set(['creator','lastModifiedBy','title','subject','description','keywords','category','contentStatus','identifier','language','created','modified','lastPrinted','revision']),
    'docProps/app.xml': new Set(['application','company','manager','template','appversion','hyperlinkbase'])
  };
  const readableNames = {
    creator:'Autor', lastModifiedBy:'Última pessoa que editou', title:'Título', subject:'Assunto',
    description:'Descrição', keywords:'Palavras-chave', category:'Categoria', contentStatus:'Status',
    identifier:'Identificador', language:'Idioma', created:'Data de criação', modified:'Data de alteração',
    lastPrinted:'Última impressão', revision:'Número de revisão', application:'Aplicativo',
    company:'Empresa', manager:'Responsável', template:'Modelo', appversion:'Versão do aplicativo',
    hyperlinkbase:'Pasta-base de links', custom:'Propriedades personalizadas'
  };
  let currentFile = null;
  let currentZip = null;
  let isBusy = false;
  let officeLibraryPromise = null;

  function ensureOfficeLibrary() {
    if (window.JSZip) return Promise.resolve();
    if (!officeLibraryPromise) {
      officeLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        script.onload = () => window.JSZip ? resolve() : reject(new Error('JSZip indisponível'));
        script.onerror = () => reject(new Error('Falha ao carregar JSZip'));
        document.head.append(script);
      }).catch(error => {
        officeLibraryPromise = null;
        throw error;
      });
    }
    return officeLibraryPromise;
  }

  const formatBytes = bytes => bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  const say = (message, state = '') => { status.textContent = message; status.dataset.state = state; };
  const setBusy = value => {
    isBusy = value;
    choose.disabled = value;
    analyze.disabled = value || !currentFile;
    clean.disabled = value || !currentZip;
    reset.disabled = value || !currentFile;
  };
  const clearResults = () => { results.classList.add('utility-hidden'); fieldList.replaceChildren(); clean.disabled = true; };
  const resetTool = () => {
    currentFile = null;
    currentZip = null;
    input.value = '';
    selected.classList.add('utility-hidden');
    clearResults();
    setBusy(false);
    say('Escolha um documento Office para começar.');
  };
  const parseXml = text => {
    const parsed = new DOMParser().parseFromString(text, 'application/xml');
    if (parsed.getElementsByTagName('parsererror').length) throw new Error('xml');
    return parsed;
  };
  const elements = doc => Array.from(doc.getElementsByTagName('*'));
  const isSigned = zip => Object.keys(zip.files).some(name => /(^|\/)_xmlsignatures\//i.test(name) || /(^|\/)origin\.sigs$/i.test(name));
  const addReport = label => {
    const item = document.createElement('li');
    item.textContent = label;
    fieldList.append(item);
  };

  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    clearResults();
    currentZip = null;
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['docx','xlsx','pptx'].includes(extension)) {
      currentFile = null;
      selected.classList.add('utility-hidden');
      say('Escolha um arquivo .docx, .xlsx ou .pptx. Formatos com macros e arquivos antigos não são aceitos.', 'error');
      setBusy(false);
      return;
    }
    if (file.size > MAX_SIZE) {
      currentFile = null;
      selected.classList.add('utility-hidden');
      say('Este documento passa do limite de 15 MB. Tente uma cópia menor.', 'error');
      setBusy(false);
      return;
    }
    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size) + ' · limite de 15 MB';
    selected.classList.remove('utility-hidden');
    setBusy(false);
    say('Arquivo selecionado. Analise os campos de propriedades que esta ferramenta reconhece.');
  });

  analyze.addEventListener('click', async () => {
    if (!currentFile) return;
    setBusy(true);
    say('Carregando a ferramenta de documentos pela primeira vez…', 'busy');
    try {
      await ensureOfficeLibrary();
      say('Lendo as propriedades localmente no navegador…', 'busy');
      const zip = await JSZip.loadAsync(await currentFile.arrayBuffer(), { checkCRC32: false });
      if (isSigned(zip)) {
        currentZip = null;
        say('Este arquivo parece ter uma assinatura digital. Não vamos regravá-lo para evitar invalidar a assinatura.', 'error');
        return;
      }
      const found = [];
      for (const [path, names] of Object.entries(commonFields)) {
        const part = zip.file(path);
        if (!part) continue;
        const doc = parseXml(await part.async('string'));
        for (const node of elements(doc)) {
          const local = (node.localName || node.nodeName.split(':').pop()).toLowerCase();
          if (names.has(local) && node.textContent.trim()) found.push(readableNames[local] || local);
        }
      }
      const customPart = zip.file('docProps/custom.xml');
      if (customPart) {
        const customDoc = parseXml(await customPart.async('string'));
        if (elements(customDoc).some(node => (node.localName || '').toLowerCase() === 'property')) found.push(readableNames.custom);
      }
      currentZip = zip;
      fieldList.replaceChildren();
      if (found.length) for (const label of [...new Set(found)]) addReport(label);
      else addReport('Nenhuma propriedade comum preenchida foi encontrada');
      results.classList.remove('utility-hidden');
      window.higienizadorTrack?.('tool_analysis_completed', { tool: 'office' });
      clean.disabled = false;
      say(found.length ? found.length + ' campo(s) com valor foram encontrados. Os valores não são exibidos.' : 'Não encontramos propriedades comuns preenchidas; ainda é possível gerar uma cópia regravada.');
    } catch (error) {
      currentZip = null;
      clearResults();
      say(window.JSZip
        ? 'Não foi possível abrir este documento. Ele pode estar danificado, protegido ou usar uma estrutura incompatível.'
        : 'A biblioteca de documentos não carregou. Confira sua conexão e tente novamente.', 'error');
    } finally {
      setBusy(false);
    }
  });

  clean.addEventListener('click', async () => {
    if (!currentFile || !currentZip || !window.JSZip) return;
    setBusy(true);
    say('Limpando propriedades e criando uma cópia no seu navegador…', 'busy');
    try {
      let removed = 0;
      for (const [path, names] of Object.entries(commonFields)) {
        const part = currentZip.file(path);
        if (!part) continue;
        const doc = parseXml(await part.async('string'));
        for (const node of elements(doc)) {
          const local = (node.localName || node.nodeName.split(':').pop()).toLowerCase();
          if (names.has(local) && node.textContent.trim()) {
            node.textContent = '';
            removed += 1;
          }
        }
        currentZip.file(path, new XMLSerializer().serializeToString(doc));
      }
      const customPart = currentZip.file('docProps/custom.xml');
      if (customPart) {
        const customDoc = parseXml(await customPart.async('string'));
        const props = elements(customDoc).filter(node => (node.localName || '').toLowerCase() === 'property');
        removed += props.length;
        for (const property of props) if (property.parentNode) property.parentNode.removeChild(property);
        currentZip.file('docProps/custom.xml', new XMLSerializer().serializeToString(customDoc));
      }
      const blob = await currentZip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile.name.replace(/\.(docx|xlsx|pptx)$/i, '') + '-metadados-limpos.' + currentFile.name.split('.').pop().toLowerCase();
      window.higienizadorTrack?.('tool_clean_completed', { tool: 'office' });
      window.higienizadorTrack?.('tool_result_downloaded', { tool: 'office' });
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      say('Cópia criada e baixada. ' + removed + ' campo(s) de propriedades reconhecidas foram limpos; o original ficou intacto.');
    } catch (error) {
      say('Não foi possível gerar esta cópia. O original permanece intacto; tente outro documento compatível.', 'error');
    } finally {
      setBusy(false);
    }
  });
  reset.addEventListener('click', resetTool);
  resetTool();
})();
