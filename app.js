const MAX_FILES = 20;
const MAX_TOTAL = 100 * 1024 * 1024;
const MAX_FILE = 40 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

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
      messages.push(`O limite é ${MAX_FILES} imagens por sessão.`);
      break;
    }
    if (!supportedTypes.has(file.type)) {
      messages.push(`${file.name}: formato não suportado. Use JPEG, PNG ou WebP.`);
      continue;
    }
    if (file.size > MAX_FILE) {
      messages.push(`${file.name}: o limite por imagem é 40 MB.`);
      continue;
    }
    if (totalBytes + file.size > MAX_TOTAL) {
      messages.push('O limite total de 100 MB por sessão foi atingido.');
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
    thumb.alt = `Prévia de ${item.file.name}`;

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
      result.textContent = 'Pronta';
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'row-download';
      downloadBtn.type = 'button';
      downloadBtn.textContent = 'Baixar';
      downloadBtn.setAttribute('aria-label', `Baixar ${item.result.name}`);
      downloadBtn.addEventListener('click', () => download(item));
      row.append(thumb, info, result, downloadBtn);
    } else {
      result.textContent = item.error ? 'Não foi possível limpar' : 'Aguardando';
      if (item.error) {
        result.title = item.error;
        result.setAttribute('aria-label', `${result.textContent}: ${item.error}`);
      }
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-file';
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', `Remover ${item.file.name} da lista`);
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

  count.textContent = `${items.length} ${items.length === 1 ? 'imagem' : 'imagens'}`;
  sizeLabel.textContent = items.length ? `· ${formatSize(totalBytes)} no total` : '';
  const pending = items.some(item => !item.result);
  processBtn.disabled = !items.length || !pending;
  if (!processBtn.dataset.busy) {
    processBtn.innerHTML = itemErrorExists() ? 'Tentar novamente <span aria-hidden="true">↻</span>' : 'Remover metadados <span aria-hidden="true">✳</span>';
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
  const link = document.createElement('a');
  link.href = item.result.url;
  link.download = item.result.name;
  document.body.append(link);
  link.click();
  link.remove();
}

async function stripImageMetadata(file) {
  if (!supportedTypes.has(file.type)) throw new Error('Formato não suportado.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Não foi possível abrir a imagem. Exporte-a novamente como JPEG, PNG ou WebP.');
  }

  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    bitmap.close();
    throw new Error('Imagem acima de 40 megapixels: pode exigir memória demais neste aparelho.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Este navegador não conseguiu preparar a imagem.');
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
  if (!blob) throw new Error('Não foi possível exportar a imagem. Tente em outro navegador.');

  const actualType = blob.type || requestedType;
  const extension = actualType === 'image/png' ? 'png' : actualType === 'image/webp' ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '') || 'imagem';
  return { blob, name: `${safeName(base)}-limpo.${extension}`, type: actualType };
}

processBtn.addEventListener('click', async () => {
  const pending = items.filter(item => !item.result);
  if (!pending.length) return;
  processBtn.dataset.busy = 'true';
  processBtn.disabled = true;
  processBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Limpando…';
  let completed = 0;
  let failed = 0;
  for (const item of pending) {
    setStatus(`Processando ${completed + failed + 1} de ${pending.length} no seu aparelho…`);
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
  if (failed) {
    setStatus(`${completed} imagem(ns) limpa(s). ${failed} não puderam ser processadas; confira o aviso no item.`, 'error');
  } else {
    setStatus(`Pronto — ${completed} ${completed === 1 ? 'imagem reexportada' : 'imagens reexportadas'} sem os metadados compatíveis.`);
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
