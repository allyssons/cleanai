const MAX_FILES = 20;
const MAX_TOTAL = 100 * 1024 * 1024;
const MAX_FILE = 40 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const IS_ENGLISH = document.documentElement.lang === 'en';
const localized = (pt, en) => IS_ENGLISH ? en : pt;

const input = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const list = document.querySelector('#fileList');
const area = document.querySelector('#fileArea');
const count = document.querySelector('#fileCount');
const sizeLabel = document.querySelector('#fileSize');
const status = document.querySelector('#status');
const processBtn = document.querySelector('#processBtn');
const downloadAllBtn = document.querySelector('#downloadAllBtn');
let items = [];

const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const formatSize = bytes => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const safeName = name => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

function setStatus(message, tone = 'success') {
  status.textContent = message;
  status.dataset.tone = tone;
}

function releaseItem(item) {
  URL.revokeObjectURL(item.preview);
  if (item.result?.url) URL.revokeObjectURL(item.result.url);
}

function addFiles(files) {
  let totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
  const messages = [];
  for (const file of files) {
    if (items.length >= MAX_FILES) {
      messages.push(localized(`O limite é ${MAX_FILES} imagens por sessão.`, `Limit is ${MAX_FILES} images per session.`));
      break;
    }
    if (!supportedTypes.has(file.type)) {
      messages.push(localized(`${file.name}: formato não suportado. Use JPEG, PNG ou WebP.`, `${file.name}: unsupported format. Use JPEG, PNG, or WebP.`));
      continue;
    }
    if (file.size > MAX_FILE) {
      messages.push(localized(`${file.name}: o limite por imagem é 40 MB.`, `${file.name}: the per-image limit is 40 MB.`));
      continue;
    }
    if (totalBytes + file.size > MAX_TOTAL) {
      messages.push(localized('O limite total de 100 MB por sessão foi atingido.', 'The 100 MB total session limit has been reached.'));
      break;
    }
    if (items.some(item => item.file.name === file.name && item.file.size === file.size)) continue;
    items.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), result: null, error: null });
    totalBytes += file.size;
  }
  setStatus(messages.join(' ') || '', messages.length ? 'error' : 'success');
  render();
}

function render() {
  area.hidden = items.length === 0;
  list.replaceChildren();
  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.setAttribute('role', 'listitem');
    row.dataset.itemId = item.id;

    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    thumb.src = item.preview;
    thumb.alt = localized(`Prévia de ${item.file.name}`, `Preview of ${item.file.name}`);

    const info = document.createElement('div');
    info.className = 'file-info';
    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = item.file.name;
    const meta = document.createElement('div');
    meta.className = 'file-meta';
    meta.textContent = `${formatSize(item.file.size)} · ${item.file.type.split('/')[1].toUpperCase()}`;
    info.append(name, meta);

    const result = document.createElement('div');
    result.className = 'file-result';
    if (item.result) {
      result.classList.add('ready');
      result.textContent = localized('Pronta', 'Ready');
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'row-download';
      downloadBtn.type = 'button';
      downloadBtn.textContent = localized('Baixar', 'Download');
      downloadBtn.setAttribute('aria-label', localized(`Baixar ${item.result.name}`, `Download ${item.result.name}`));
      downloadBtn.addEventListener('click', () => download(item));
      row.append(thumb, info, result, downloadBtn);
    } else {
      result.textContent = item.error ? localized('Não foi possível limpar', 'Could not clean') : localized('Aguardando', 'Waiting');
      if (item.error) {
        result.title = item.error;
        result.setAttribute('aria-label', `${result.textContent}: ${item.error}`);
      }
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-file';
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', localized(`Remover ${item.file.name} da lista`, `Remove ${item.file.name} from the list`));
      removeBtn.addEventListener('click', () => removeItem(item.id));
      row.append(thumb, info, result, removeBtn);
      if (item.error) {
        const error = document.createElement('div');
        error.className = 'file-error';
        error.textContent = item.error;
        row.append(error);
      }
    }
    list.append(row);
  }

  count.textContent = `${items.length} ${items.length === 1 ? localized('imagem', 'image') : localized('imagens', 'images')}`;
  sizeLabel.textContent = items.length ? localized(`· ${formatSize(totalBytes)} no total`, `· ${formatSize(totalBytes)} total`) : '';
  const pending = items.some(item => !item.result);
  processBtn.disabled = !items.length || !pending;
  if (!processBtn.dataset.busy) {
    processBtn.innerHTML = itemErrorExists() ? localized('Tentar novamente <span aria-hidden="true">↻</span>', 'Try again <span aria-hidden="true">↻</span>') : localized('Remover metadados <span aria-hidden="true">✳</span>', 'Remove metadata <span aria-hidden="true">✳</span>');
  }
  downloadAllBtn.hidden = !items.some(item => item.result);
}

function itemErrorExists() {
  return items.some(item => item.error);
}

function removeItem(id) {
  const index = items.findIndex(item => item.id === id);
  if (index < 0) return;
  releaseItem(items[index]);
  items.splice(index, 1);
  if (!items.length) setStatus('');
  render();
}

function download(item) {
  if (!item.result) return;
  window.higienizadorTrack?.('tool_result_downloaded', { tool: 'image' });
  const link = document.createElement('a');
  link.href = item.result.url;
  link.download = item.result.name;
  document.body.append(link);
  link.click();
  link.remove();
}

async function stripImageMetadata(file) {
  if (!supportedTypes.has(file.type)) throw new Error(localized('Formato não suportado.', 'Unsupported format.'));
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(localized('Não foi possível abrir a imagem. Exporte-a novamente como JPEG, PNG ou WebP.', 'Could not open the image. Export it again as JPEG, PNG, or WebP.'));
  }

  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    bitmap.close();
    throw new Error(localized('Imagem acima de 40 megapixels: pode exigir memória demais neste aparelho.', 'Image exceeds 40 megapixels and may require too much memory on this device.'));
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error(localized('Este navegador não conseguiu preparar a imagem.', 'This browser could not prepare the image.'));
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const requestedType = file.type === 'image/jpeg' ? 'image/jpeg' : file.type;
  const blob = await new Promise(resolve => canvas.toBlob(
    resolve,
    requestedType,
    requestedType === 'image/jpeg' ? 0.94 : undefined
  ));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error(localized('Não foi possível exportar a imagem. Tente em outro navegador.', 'Could not export the image. Try another browser.'));

  const actualType = blob.type || requestedType;
  const extension = actualType === 'image/png' ? 'png' : actualType === 'image/webp' ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '') || 'imagem';
  return { blob, name: `${safeName(base)}${IS_ENGLISH ? '-clean' : '-limpo'}.${extension}`, type: actualType };
}

processBtn.addEventListener('click', async () => {
  const pending = items.filter(item => !item.result);
  if (!pending.length) return;
  processBtn.dataset.busy = 'true';
  processBtn.disabled = true;
  processBtn.innerHTML = localized('<span class="spinner" aria-hidden="true"></span> Limpando…', '<span class="spinner" aria-hidden="true"></span> Cleaning…');
  let completed = 0;
  let failed = 0;
  for (const item of pending) {
    setStatus(localized(`Processando ${completed + failed + 1} de ${pending.length} no seu aparelho…`, `Processing ${completed + failed + 1} of ${pending.length} on your device…`));
    try {
      const output = await stripImageMetadata(item.file);
      item.result = { ...output, url: URL.createObjectURL(output.blob) };
      item.error = null;
      completed++;
    } catch (error) {
      item.error = error.message;
      failed++;
    }
    render();
  }
  delete processBtn.dataset.busy;
  render();
  if (completed) window.higienizadorTrack?.('tool_clean_completed', { tool: 'image', itemCount: completed });
  if (failed) {
    setStatus(localized(`${completed} imagem(ns) limpa(s). ${failed} não puderam ser processadas; confira o aviso no item.`, `${completed} image(s) cleaned. ${failed} could not be processed; check the message on each item.`), 'error');
  } else {
    setStatus(localized(`Pronto — ${completed} ${completed === 1 ? 'imagem reexportada' : 'imagens reexportadas'} sem os metadados compatíveis.`, `Done — ${completed} ${completed === 1 ? 'image re-exported' : 'images re-exported'} without compatible metadata.`));
  }
});

downloadAllBtn.addEventListener('click', async () => {
  const ready = items.filter(item => item.result);
  for (const item of ready) {
    download(item);
    await new Promise(resolve => setTimeout(resolve, 350));
  }
});

document.querySelector('#chooseBtn').addEventListener('click', event => {
  event.stopPropagation();
  input.click();
});
dropzone.addEventListener('click', event => {
  if (event.target.id !== 'chooseBtn') input.click();
});
input.addEventListener('change', () => {
  addFiles(input.files);
  input.value = '';
});
for (const eventName of ['dragenter', 'dragover']) {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    dropzone.classList.add('dragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    dropzone.classList.remove('dragging');
  });
}
dropzone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
document.querySelector('#clearBtn').addEventListener('click', () => {
  items.forEach(releaseItem);
  items = [];
  setStatus('');
  render();
});
window.addEventListener('beforeunload', () => items.forEach(releaseItem));

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.body.classList.add('is-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
}

// Text cleanup only normalizes common hidden formatting marks; it never rewrites prose.
const sourceText = document.querySelector('#sourceText');
if (sourceText) {
  const cleanedText = document.querySelector('#cleanedText');
  const wordCount = document.querySelector('#wordCount');
  const outputLabel = document.querySelector('#outputLabel');
  const findings = document.querySelector('#textFindings');
  const textStatus = document.querySelector('#textStatus');
  const analyzeTextBtn = document.querySelector('#analyzeTextBtn');
  const cleanTextBtn = document.querySelector('#cleanTextBtn');
  const copyTextBtn = document.querySelector('#copyTextBtn');
  const downloadTextBtn = document.querySelector('#downloadTextBtn');
  const textFileInput = document.querySelector('#textFileInput');
  const removeBidi = document.querySelector('#removeBidi');
  const bidiMarks = new Set(['\u061c', '\u200e', '\u200f', '\u202a', '\u202b', '\u202c', '\u202d', '\u202e', '\u2066', '\u2067', '\u2068', '\u2069']);
  const removeMarks = new Set(['\u00ad', '\u200b', '\u2060', '\ufeff']);
  const specialSpaces = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/u;
  const tagMark = /[\u{e0000}-\u{e007f}]/u;
  const controlMark = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
  let sourceName = localized('texto.txt', 'text.txt');

  function countWords(value) {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/u).length : 0;
  }

  function classifyChar(char) {
    if (specialSpaces.test(char)) return { group: localized('Espaços especiais', 'Special spaces'), action: localized('normalizado para espaço comum', 'normalized to a regular space'), code: char.codePointAt(0) };
    if (removeMarks.has(char)) return { group: localized('Marcas invisíveis', 'Invisible marks'), action: localized('removida', 'removed'), code: char.codePointAt(0) };
    if (tagMark.test(char)) return { group: localized('Caracteres de tag invisíveis', 'Invisible tag characters'), action: localized('removido', 'removed'), code: char.codePointAt(0) };
    if (controlMark.test(char)) return { group: localized('Caracteres de controle', 'Control characters'), action: localized('removido', 'removed'), code: char.codePointAt(0) };
    if (bidiMarks.has(char)) return { group: localized('Controles de direção', 'Direction controls'), action: localized('opcional — mantido por padrão', 'optional — kept by default'), code: char.codePointAt(0) };
    return null;
  }

  function scanText(value) {
    const groups = new Map();
    let total = 0;
    for (const char of value) {
      const match = classifyChar(char);
      if (!match) continue;
      total++;
      const key = `${match.group}|${match.action}`;
      const current = groups.get(key) || { ...match, count: 0, codes: new Set() };
      current.count++;
      current.codes.add(match.code.toString(16).toUpperCase().padStart(4, '0'));
      groups.set(key, current);
    }
    return { total, groups: [...groups.values()] };
  }

  function updateFindings(value) {
    const report = scanText(value);
    findings.replaceChildren();
    findings.hidden = false;
    const summary = document.createElement('strong');
    summary.textContent = report.total
      ? localized(`${report.total} ocorrência(s) encontrada(s) em ${report.groups.length} grupo(s). Revise antes de limpar:`, `${report.total} occurrence(s) found in ${report.groups.length} group(s). Review before cleaning:`)
      : localized('Nenhum dos caracteres invisíveis comuns que verificamos foi encontrado.', 'None of the common invisible characters we check for were found.');
    findings.append(summary);
    if (report.groups.length) {
      const chips = document.createElement('div');
      chips.className = 'finding-list';
      for (const group of report.groups.slice(0, 8)) {
        const chip = document.createElement('span');
        chip.className = 'finding-chip';
        chip.textContent = `${group.group}: `;
        const amount = document.createElement('b');
        amount.textContent = group.count;
        chip.append(amount, document.createTextNode(` · U+${[...group.codes].slice(0, 3).join(', U+')}`));
        chips.append(chip);
      }
      findings.append(chips);
    }
    return report;
  }

  function cleanSource(value) {
    let output = '';
    for (const char of value) {
      if (specialSpaces.test(char)) output += ' ';
      else if (removeMarks.has(char) || tagMark.test(char) || controlMark.test(char)) continue;
      else if (removeBidi.checked && bidiMarks.has(char)) continue;
      else output += char;
    }
    return output;
  }

  function setTextStatus(message, tone = 'success') {
    textStatus.textContent = message;
    textStatus.dataset.tone = tone;
  }

  function updateWordCount() {
    const words = countWords(sourceText.value);
    wordCount.textContent = IS_ENGLISH ? `${words.toLocaleString('en-US')} words · up to 20,000` : `${words.toLocaleString('pt-BR')} palavras · até 20.000`;
    const tooLong = words > 20000;
    analyzeTextBtn.disabled = tooLong;
    cleanTextBtn.disabled = tooLong;
    if (tooLong) setTextStatus(localized('O limite é de 20.000 palavras. Reduza o texto para continuar.', 'The limit is 20,000 words. Shorten the text to continue.'), 'error');
  }

  function markOutputStale() {
    cleanedText.value = '';
    outputLabel.textContent = localized('Aguardando limpeza', 'Waiting for cleaning');
    copyTextBtn.disabled = true;
    downloadTextBtn.disabled = true;
    if (!findings.hidden) findings.hidden = true;
    setTextStatus('');
    updateWordCount();
  }

  sourceText.addEventListener('input', markOutputStale);
  analyzeTextBtn.addEventListener('click', () => {
    if (countWords(sourceText.value) > 20000) return updateWordCount();
    updateFindings(sourceText.value);
    window.higienizadorTrack?.('tool_analysis_completed', { tool: 'text' });
    setTextStatus(localized('Análise concluída. O conteúdo não foi alterado.', 'Analysis complete. The content has not been changed.'));
  });
  cleanTextBtn.addEventListener('click', () => {
    const words = countWords(sourceText.value);
    if (!sourceText.value.trim()) return setTextStatus(localized('Cole ou digite um texto antes de limpar.', 'Paste or type some text before cleaning.'), 'error');
    if (words > 20000) return updateWordCount();
    const report = updateFindings(sourceText.value);
    cleanedText.value = cleanSource(sourceText.value);
    outputLabel.textContent = localized('Resultado pronto', 'Result ready');
    copyTextBtn.disabled = false;
    downloadTextBtn.disabled = false;
    const removed = report.groups.filter(group => !group.action.startsWith('opcional')).reduce((sum, group) => sum + group.count, 0);
    window.higienizadorTrack?.('tool_clean_completed', { tool: 'text' });
    setTextStatus(removed
      ? localized(`Pronto. ${removed} ocorrência(s) removida(s) ou normalizada(s); palavras e pontuação foram preservadas.`, `Done. ${removed} occurrence(s) removed or normalized; words and punctuation were preserved.`)
      : localized('Pronto. Não encontramos marcas comuns para remover; o texto foi mantido.', 'Done. We found no common marks to remove, so the text was left unchanged.'));
  });
  copyTextBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(cleanedText.value);
      window.higienizadorTrack?.('tool_result_copied', { tool: 'text' });
      setTextStatus(localized('Resultado copiado para a área de transferência.', 'Result copied to the clipboard.'));
    } catch {
      cleanedText.focus();
      cleanedText.select();
      setTextStatus(localized('Não foi possível copiar automaticamente. O resultado está selecionado para você copiar.', 'Could not copy automatically. The result is selected for you to copy.'), 'error');
    }
  });
  downloadTextBtn.addEventListener('click', () => {
    const blob = new Blob([cleanedText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const extension = /\.md$/i.test(sourceName) ? 'md' : 'txt';
    const base = sourceName.replace(/\.(txt|md)$/i, '') || 'texto';
    link.href = url;
    link.download = `${safeName(base)}${IS_ENGLISH ? '-clean' : '-limpo'}.${extension}`;
    window.higienizadorTrack?.('tool_result_downloaded', { tool: 'text' });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
  textFileInput.addEventListener('change', async () => {
    const file = textFileInput.files?.[0];
    textFileInput.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) return setTextStatus(localized('O arquivo pode ter no máximo 1 MB.', 'The file can be no larger than 1 MB.'), 'error');
    if (!/\.(txt|md)$/i.test(file.name)) return setTextStatus(localized('Escolha um arquivo .txt ou .md.', 'Choose a .txt or .md file.'), 'error');
    try {
      sourceText.value = await file.text();
      sourceName = file.name;
      markOutputStale();
      setTextStatus(localized(`Arquivo “${file.name}” aberto localmente.`, `File “${file.name}” opened locally.`));
      if (countWords(sourceText.value) > 20000) updateWordCount();
    } catch {
      setTextStatus(localized('Não foi possível ler o arquivo. Tente outro arquivo de texto UTF-8.', 'Could not read the file. Try another UTF-8 text file.'), 'error');
    }
  });
  document.querySelector('#sampleTextBtn').addEventListener('click', () => {
    sourceText.value = 'Texto de exemplo com um espaço especial e uma marca invisível​.';
    sourceName = localized('texto.txt', 'text.txt');
    markOutputStale();
    updateFindings(sourceText.value);
    window.higienizadorTrack?.('tool_example_loaded', { tool: 'text' });
    setTextStatus(localized('Exemplo carregado. Clique em “Limpar caracteres” para ver o resultado.', 'Example loaded. Click “Clean characters” to see the result.'));
  });
  document.querySelector('#clearTextBtn').addEventListener('click', () => {
    sourceText.value = '';
    cleanedText.value = '';
    sourceName = localized('texto.txt', 'text.txt');
    findings.hidden = true;
    outputLabel.textContent = localized('Aguardando limpeza', 'Waiting for cleaning');
    copyTextBtn.disabled = true;
    downloadTextBtn.disabled = true;
    setTextStatus('');
    updateWordCount();
    sourceText.focus();
  });
  updateWordCount();
}
