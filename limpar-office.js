(() => {
  const isEnglish = document.documentElement.lang === 'en';
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
    'docProps/core.xml': new Set(['creator','lastModifiedBy','title','subject','description','keywords','category','contentStatus','identifier','language','created','modified','lastPrinted','revision'].map(name => name.toLowerCase())),
    'docProps/app.xml': new Set(['application','company','manager','template','appversion','hyperlinkbase'])
  };
  const readableNames = isEnglish ? { creator:'Author', lastmodifiedby:'Last modified by', title:'Title', subject:'Subject', description:'Description', keywords:'Keywords', category:'Category', contentStatus:'Status', identifier:'Identifier', language:'Language', created:'Creation date', modified:'Modified date', lastPrinted:'Last printed', revision:'Revision number', application:'Application', company:'Company', manager:'Manager', template:'Template', appversion:'Application version', hyperlinkbase:'Hyperlink base', custom:'Custom properties' } : {
    creator:'Autor', lastmodifiedby:'Última pessoa que editou', title:'Título', subject:'Assunto',
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
  const messages = {"Escolha um PDF para começar.":"Choose a PDF to get started.","Escolha um arquivo PDF válido.":"Choose a valid PDF file.","Este arquivo passa do limite de 30 MB. Tente uma cópia menor.":"This file exceeds the 30 MB limit. Try a smaller copy.","Arquivo selecionado. Analise os campos comuns antes de criar a cópia.":"File selected. Review common fields before creating a copy.","Carregando a ferramenta de PDF pela primeira vez…":"Loading the PDF tool for the first time…","Lendo os campos de metadados localmente…":"Reading metadata fields locally…","Nenhum campo comum preenchido foi encontrado":"No populated common fields were found","Não foi possível ler este PDF. Arquivos protegidos por senha, danificados ou com estruturas não compatíveis não podem ser processados.":"This PDF could not be read. Password-protected, damaged, or incompatible files cannot be processed.","A biblioteca de PDF não carregou. Confira sua conexão e tente novamente.":"The PDF library could not load. Check your connection and try again.","Criando uma cópia limpa no seu navegador…":"Creating a cleaned copy in your browser…","Cópia criada e baixada. ":"Cleaned copy created and downloaded. "," entrada(s) comum(ns) de metadados foram removidas; o original ficou intacto.":" common metadata entries were removed; your original is unchanged.","Não foi possível gerar esta cópia. O arquivo original permanece intacto; tente outro PDF sem senha.":"Could not create this copy. Your original is unchanged; try another PDF without a password.","A biblioteca de PDF não carregou. O arquivo original permanece intacto; confira sua conexão e tente novamente.":"The PDF library could not load. Your original is unchanged; check your connection and try again.","Cole um ou mais links para começar.":"Paste one or more links to get started.","Exemplo carregado. Revise-o e clique em limpar.":"Example loaded. Review it, then click Clean."," não parece uma URL válida e foi mantida":" is not a valid URL and was kept"," não usa HTTP ou HTTPS e foi mantida":" does not use HTTP or HTTPS and was kept"," contém credenciais no endereço e foi mantida para revisão manual":" contains credentials and was kept for manual review","Links limpos copiados para a área de transferência.":"Cleaned links copied to the clipboard.","Não foi possível copiar automaticamente. O resultado está selecionado para cópia manual.":"Could not copy automatically. The result is selected for manual copying.","Escolha um documento Office para começar.":"Choose an Office document to get started.","xml":"xml","Escolha um arquivo .docx, .xlsx ou .pptx. Formatos com macros e arquivos antigos não são aceitos.":"Choose a .docx, .xlsx, or .pptx file. Macro-enabled and older formats are not supported.","Este documento passa do limite de 15 MB. Tente uma cópia menor.":"This document exceeds the 15 MB limit. Try a smaller copy.","Arquivo selecionado. Analise os campos de propriedades que esta ferramenta reconhece.":"File selected. Review the property fields this tool recognizes.","Carregando a ferramenta de documentos pela primeira vez…":"Loading the document tool for the first time…","Lendo as propriedades localmente no navegador…":"Reading properties locally in your browser…","Este arquivo parece ter uma assinatura digital. Não vamos regravá-lo para evitar invalidar a assinatura.":"This file appears to have a digital signature. It will not be rewritten to avoid invalidating the signature.","Nenhuma propriedade comum preenchida foi encontrada":"No populated common properties were found","Não foi possível abrir este documento. Ele pode estar danificado, protegido ou usar uma estrutura incompatível.":"Could not open this document. It may be damaged, protected, or use an incompatible structure.","A biblioteca de documentos não carregou. Confira sua conexão e tente novamente.":"The document library could not load. Check your connection and try again.","Limpando propriedades e criando uma cópia no seu navegador…":"Cleaning properties and creating a copy in your browser…"," campo(s) de propriedades reconhecidas foram limpos; o original ficou intacto.":" recognized property fields were cleared; your original is unchanged.","Não foi possível gerar esta cópia. O original permanece intacto; tente outro documento compatível.":"Could not create this copy. Your original is unchanged; try another compatible document."};
  const translate = message => {
    if (!isEnglish) return message;
    if (messages[message]) return messages[message];
    if (message.startsWith('Não encontramos propriedades comuns preenchidas;')) return 'No populated common properties were found; you can still create a rewritten copy.';
    if (message.startsWith('Cópia criada e baixada. ')) return 'Cleaned copy created and downloaded. ' + message.substring('Cópia criada e baixada. '.length).replace(' campo(s) de propriedades reconhecidas foram limpos; o original ficou intacto.', ' recognized property fields were cleared; your original is unchanged.');
    if (message.includes('campo(s) com valor foram encontrados.')) { const n = Number(message.split(' ')[0]); return n + (n === 1 ? ' populated property found. Values are not shown.' : ' populated properties found. Values are not shown.'); }
    return message;
  };
  const say = (message, state = '') => { status.textContent = translate(message); status.dataset.state = state; };
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
    fileSize.textContent = formatBytes(file.size) + (isEnglish ? ' · 15 MB limit' : ' · limite de 15 MB');
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
      link.download = currentFile.name.replace(/\.(docx|xlsx|pptx)$/i, '') + (isEnglish ? '-metadata-cleaned.' : '-metadados-limpos.') + currentFile.name.split('.').pop().toLowerCase();
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
