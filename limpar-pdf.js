(() => {
  const byId = id => document.getElementById(id);
  const input = byId('pdfFile');
  const choose = byId('pdfChoose');
  const analyze = byId('pdfAnalyze');
  const clean = byId('pdfClean');
  const reset = byId('pdfReset');
  const selected = byId('pdfSelected');
  const fileName = byId('pdfFileName');
  const fileSize = byId('pdfFileSize');
  const results = byId('pdfResults');
  const fieldList = byId('pdfFields');
  const status = byId('pdfStatus');
  const acknowledgement = byId('pdfSignedAck');
  const MAX_SIZE = 30 * 1024 * 1024;
  let currentFile = null;
  let busy = false;

  const labels = [
    ['Título', doc => doc.getTitle()],
    ['Autor', doc => doc.getAuthor()],
    ['Assunto', doc => doc.getSubject()],
    ['Palavras-chave', doc => doc.getKeywords()],
    ['Aplicativo de criação', doc => doc.getCreator()],
    ['Programa que gerou o PDF', doc => doc.getProducer()],
    ['Data de criação', doc => doc.getCreationDate()],
    ['Data de modificação', doc => doc.getModificationDate()]
  ];
  const formatBytes = bytes => bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  const say = (message, state = '') => { status.textContent = message; status.dataset.state = state; };
  const readField = (doc, getter) => { try { const value = getter(doc); return value instanceof Date ? (Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString('pt-BR')) : String(value || '').trim(); } catch { return ''; } };
  const setBusy = value => {
    busy = value;
    choose.disabled = value;
    analyze.disabled = value || !currentFile;
    clean.disabled = value || !currentFile || !acknowledgement.checked;
    reset.disabled = value || !currentFile;
  };
  const clearAnalysis = () => { results.classList.add('utility-hidden'); fieldList.replaceChildren(); clean.disabled = true; };
  const resetTool = () => {
    currentFile = null;
    input.value = '';
    selected.classList.add('utility-hidden');
    clearAnalysis();
    acknowledgement.checked = false;
    setBusy(false);
    say('Escolha um PDF para começar.');
  };

  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    clearAnalysis();
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
      currentFile = null;
      selected.classList.add('utility-hidden');
      say('Escolha um arquivo PDF válido.', 'error');
      setBusy(false);
      return;
    }
    if (file.size > MAX_SIZE) {
      currentFile = null;
      selected.classList.add('utility-hidden');
      say('Este arquivo passa do limite de 30 MB. Tente uma cópia menor.', 'error');
      setBusy(false);
      return;
    }
    currentFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size) + ' · limite de 30 MB';
    selected.classList.remove('utility-hidden');
    acknowledgement.checked = false;
    setBusy(false);
    say('Arquivo selecionado. Analise os campos comuns antes de criar a cópia.');
  });

  acknowledgement.addEventListener('change', () => {
    clean.disabled = busy || !currentFile || !acknowledgement.checked;
  });

  analyze.addEventListener('click', async () => {
    if (!currentFile) return;
    if (!window.PDFLib) { say('A biblioteca de PDF não carregou. Confira sua conexão e tente novamente.', 'error'); return; }
    setBusy(true);
    say('Lendo os campos de metadados localmente…', 'busy');
    try {
      const bytes = await currentFile.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      const found = labels.filter(([, getter]) => readField(doc, getter));
      fieldList.replaceChildren();
      if (found.length) {
        for (const [label] of found) {
          const item = document.createElement('li');
          item.textContent = label;
          fieldList.append(item);
        }
      } else {
        const item = document.createElement('li');
        item.textContent = 'Nenhum campo comum preenchido foi encontrado';
        fieldList.append(item);
      }
      results.classList.remove('utility-hidden');
      window.higienizadorTrack?.('tool_analysis_completed', { tool: 'pdf' });
      clean.dataset.infoCount = String(found.length);
      say(found.length ? found.length + ' campo(s) comum(ns) preenchido(s) encontrado(s). Os valores não são mostrados.' : 'Não encontramos campos comuns preenchidos; ainda é possível gerar uma cópia regravada.', '');
    } catch (error) {
      results.classList.add('utility-hidden');
      say('Não foi possível ler este PDF. Arquivos protegidos por senha, danificados ou com estruturas não compatíveis não podem ser processados.', 'error');
    } finally {
      setBusy(false);
    }
  });

  clean.addEventListener('click', async () => {
    if (!currentFile || !acknowledgement.checked || !window.PDFLib) return;
    setBusy(true);
    say('Criando uma cópia limpa no seu navegador…', 'busy');
    try {
      const bytes = await currentFile.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      const infoRef = doc.context && doc.context.trailerInfo && doc.context.trailerInfo.Info;
      let removed = 0;
      if (infoRef) {
        const info = doc.context.lookup(infoRef);
        if (info && typeof info.keys === 'function' && typeof info.delete === 'function') {
          for (const key of info.keys()) if (info.delete(key)) removed += 1;
        }
      }
      if (doc.catalog && typeof doc.catalog.delete === 'function' && doc.catalog.delete(PDFLib.PDFName.of('Metadata'))) removed += 1;
      const cleanedBytes = await doc.save();
      const blob = new Blob([cleanedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile.name.replace(/\.pdf$/i, '') + '-metadados-limpos.pdf';
      window.higienizadorTrack?.('tool_clean_completed', { tool: 'pdf' });
      window.higienizadorTrack?.('tool_result_downloaded', { tool: 'pdf' });
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      say('Cópia criada e baixada. ' + removed + ' entrada(s) comum(ns) de metadados foram removidas; o original ficou intacto.');
    } catch (error) {
      say('Não foi possível gerar esta cópia. O arquivo original permanece intacto; tente outro PDF sem senha.', 'error');
    } finally {
      setBusy(false);
    }
  });
  reset.addEventListener('click', resetTool);
  resetTool();
})();
