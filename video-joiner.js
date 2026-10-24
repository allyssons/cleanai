(() => {
  'use strict';

  const MAX_FILES = 6;
  const MAX_FILE_BYTES = 60 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 120 * 1024 * 1024;
  const MAX_DURATION = 10 * 60;
  const MAX_TOTAL_DURATION = 15 * 60;
const FFmpegBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
  const FFmpegScript = '/vendor/ffmpeg/ffmpeg.js';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    tooMany: 'Choose up to six video files.', tooLarge: 'Each video must be 60 MB or smaller.', totalLarge: 'The combined file size must be 120 MB or smaller.',
    invalid: 'Choose MP4 or MOV files with audio.', empty: 'This file is empty.',
    ready: 'Files are ready. Arrange their order, then analyze the cuts.',
    library: 'Loading the video engine (about 31 MB). This happens only when you start the tool.',
    libraryError: 'The video engine could not be loaded. Check your connection and try again.',
    working: 'Preparing videos in this browser…', analyzing: (i,n) => `Analyzing silence in clip ${i} of ${n}…`,
    creating: 'Joining clips and rendering the MP4 in this browser…', doneAnalysis: 'Cut analysis is ready. Review the proposed clips before creating the video.',
    noAudio: 'We could not find an audio track in this clip. This tool needs audio to detect speech and silence.',
    badVideo: 'We could not read this video. Use a complete MP4 or MOV file with a supported video and audio codec.',
    tooLong: 'Each clip must be ten minutes or shorter, and all clips together must stay under fifteen minutes.',
    totalTooLong: 'All selected clips together must be fifteen minutes or shorter in this version.',
    createReady: 'The video is ready. Play the preview and check the audio before sharing.',
    renderError: 'The browser could not finish this video. Try fewer or smaller clips on a computer.',
    memoryError: 'The browser ran out of memory. Try fewer or smaller clips, or close other tabs.',
    analyzingButton: 'Analyzing…', creatingButton: 'Creating video…', loadingButton: 'Preparing…',
    up: 'Move up', down: 'Move down', remove: 'Remove', clip: 'Clip', cut: 'Cut', keeps: 'Keeps', starts: 'from', ends: 'to', full: 'No edge silence found; keeps the full clip.',
    removed: 'removed at the edges', noSpeech: 'No clear speech segment was detected; keeps the full clip.',
    selectionRequired: 'Add at least two clips to continue.', progress: 'Working locally in your browser. Processing time depends on your device and video length.'
  } : {
    tooMany: 'Escolha até seis vídeos.', tooLarge: 'Cada vídeo precisa ter até 60 MB.', totalLarge: 'O tamanho total dos arquivos precisa ser de até 120 MB.',
    invalid: 'Escolha arquivos MP4 ou MOV com áudio.', empty: 'Este arquivo está vazio.',
    ready: 'Arquivos prontos. Organize a ordem e analise os cortes.',
    library: 'Carregando o mecanismo de vídeo (cerca de 31 MB). Isso acontece somente ao iniciar a ferramenta.',
    libraryError: 'Não foi possível carregar o mecanismo de vídeo. Confira sua conexão e tente novamente.',
    working: 'Preparando os vídeos neste navegador…', analyzing: (i,n) => `Analisando o silêncio no clipe ${i} de ${n}…`,
    creating: 'Juntando os clipes e montando o MP4 neste navegador…', doneAnalysis: 'Análise pronta. Revise os cortes propostos antes de criar o vídeo.',
    noAudio: 'Não encontramos uma faixa de áudio neste clipe. A ferramenta precisa do áudio para detectar fala e silêncio.',
    badVideo: 'Não conseguimos ler este vídeo. Use um arquivo MP4 ou MOV íntegro com codecs de áudio e vídeo compatíveis.',
    tooLong: 'Cada clipe precisa ter até dez minutos e, juntos, os vídeos devem ter até quinze minutos.',
    totalTooLong: 'Nesta versão, a duração somada dos clipes precisa ser de até quinze minutos.',
    createReady: 'Vídeo pronto. Assista à prévia e confira o áudio antes de compartilhar.',
    renderError: 'O navegador não conseguiu terminar este vídeo. Tente menos clipes ou arquivos menores em um computador.',
    memoryError: 'O navegador ficou sem memória. Tente menos clipes ou arquivos menores e feche outras abas.',
    analyzingButton: 'Analisando…', creatingButton: 'Criando vídeo…', loadingButton: 'Preparando…',
    up: 'Mover para cima', down: 'Mover para baixo', remove: 'Remover', clip: 'Clipe', cut: 'Corte', keeps: 'Mantém', starts: 'de', ends: 'a', full: 'Nenhum silêncio de borda encontrado; mantém o clipe inteiro.',
    removed: 'removidos nas bordas', noSpeech: 'Não encontramos fala clara; o clipe inteiro será mantido.',
    selectionRequired: 'Adicione pelo menos dois clipes para continuar.', progress: 'Processamento local no navegador. O tempo depende do aparelho e da duração dos vídeos.'
  };

  const $ = (id) => document.getElementById(id);
  const input = $('joinerFiles');
  const dropzone = $('joinerDropzone');
  if (!input || !dropzone) return;

  const choose = $('joinerChoose');
  const selection = $('joinerSelection');
  const orderList = $('joinerOrder');
  const count = $('joinerCount');
  const analyzeButton = $('joinerAnalyze');
  const createButton = $('joinerCreate');
  const resetButton = $('joinerReset');
  const status = $('joinerStatus');
  const progress = $('joinerProgress');
  const results = $('joinerResults');
  const cutsList = $('joinerCuts');
  const preview = $('joinerPreview');
  const video = $('joinerVideo');
  const downloadLink = $('joinerDownload');
  const fadeInput = $('joinerFade');
  const pauseInput = $('joinerPause');
  const marginStartInput = $('joinerMarginStart');
  const marginEndInput = $('joinerMarginEnd');

  let clips = [];
  let ffmpeg = null;
  let enginePromise = null;
  let analysis = null;
  let running = false;
  let activeLogs = null;
  let outputUrl = null;
  let currentRun = 0;

  function setStatus(message, state = '') {
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  function setWorking(value) {
    running = value;
    progress.classList.toggle('utility-hidden', !value);
    analyzeButton.disabled = value || clips.length < 2;
    createButton.disabled = value || !analysis;
    choose.disabled = value;
    resetButton.disabled = value;
  }

  function bytesLabel(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function invalidateAnalysis() {
    analysis = null;
    results.classList.add('utility-hidden');
    cutsList.replaceChildren();
    createButton.disabled = true;
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      outputUrl = null;
      video.removeAttribute('src');
      video.load();
      preview.classList.add('utility-hidden');
    }
  }

  async function removeEngineFiles() {
    if (!ffmpeg) return;
    for (let i = 0; i < MAX_FILES; i += 1) {
      try { await ffmpeg.deleteFile(`clip-${i}.mp4`); } catch (_) {}
      try { await ffmpeg.deleteFile(`clip-${i}.mov`); } catch (_) {}
    }
    try { await ffmpeg.deleteFile('joined-output.mp4'); } catch (_) {}
  }

  function formatSeconds(seconds) {
    const value = Math.max(0, seconds);
    const minutes = Math.floor(value / 60);
    const rest = (value - minutes * 60).toFixed(2).padStart(5, '0');
    return `${minutes}:${rest.padStart(5, '0')}`;
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)} s`;
    return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
  }

  function renderFiles() {
    orderList.replaceChildren();
    clips.forEach((clip, index) => {
      const item = document.createElement('li');
      item.className = 'joiner-file';
      const number = document.createElement('span');
      number.className = 'joiner-file-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const details = document.createElement('span');
      details.className = 'joiner-file-details';
      const name = document.createElement('strong');
      name.textContent = clip.file.name;
      const meta = document.createElement('small');
      meta.textContent = `${bytesLabel(clip.file.size)} · ${clip.file.name.split('.').pop().toUpperCase()}`;
      details.append(name, meta);
      const controls = document.createElement('span');
      controls.className = 'joiner-file-controls';
      const up = document.createElement('button');
      up.type = 'button'; up.className = 'quiet-button'; up.textContent = '↑'; up.setAttribute('aria-label', `${copy.up}: ${clip.file.name}`); up.disabled = index === 0 || running;
      up.addEventListener('click', () => moveClip(index, -1));
      const down = document.createElement('button');
      down.type = 'button'; down.className = 'quiet-button'; down.textContent = '↓'; down.setAttribute('aria-label', `${copy.down}: ${clip.file.name}`); down.disabled = index === clips.length - 1 || running;
      down.addEventListener('click', () => moveClip(index, 1));
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'quiet-button joiner-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `${copy.remove}: ${clip.file.name}`); remove.disabled = running;
      remove.addEventListener('click', () => removeClip(index));
      controls.append(up, down, remove);
      item.append(number, details, controls);
      orderList.append(item);
    });

    selection.classList.toggle('utility-hidden', clips.length === 0);
    count.textContent = isEnglish ? `${clips.length} of ${MAX_FILES} clips` : `${clips.length} de ${MAX_FILES} clipes`;
    analyzeButton.disabled = running || clips.length < 2;
  }

  function moveClip(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= clips.length || running) return;
    [clips[index], clips[target]] = [clips[target], clips[index]];
    invalidateAnalysis();
    renderFiles();
    setStatus(copy.ready);
  }

  function removeClip(index) {
    if (running) return;
    const clip = clips[index];
    if (ffmpeg && clip?.engineName) ffmpeg.deleteFile(clip.engineName).catch(() => {});
    clips.splice(index, 1);
    invalidateAnalysis();
    renderFiles();
    setStatus(clips.length ? copy.ready : '');
  }

  function resetClips() {
    if (running) return;
    clips.forEach((clip) => {
      if (ffmpeg && clip.engineName) ffmpeg.deleteFile(clip.engineName).catch(() => {});
    });
    clips = [];
    input.value = '';
    invalidateAnalysis();
    renderFiles();
    setStatus('');
  }

  function addFiles(fileList) {
    if (running) return;
    const incoming = [...fileList];
    if (!incoming.length) return;
    if (clips.length + incoming.length > MAX_FILES) {
      setStatus(copy.tooMany, 'error');
      return;
    }
    const total = clips.reduce((sum, clip) => sum + clip.file.size, 0);
    for (const file of incoming) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (!['mp4', 'mov'].includes(extension) || !file.size) {
        setStatus(file.size ? copy.invalid : copy.empty, 'error');
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus(copy.tooLarge, 'error');
        return;
      }
      if (total + incoming.slice(0, incoming.indexOf(file) + 1).reduce((sum, item) => sum + item.size, 0) > MAX_TOTAL_BYTES) {
        setStatus(copy.totalLarge, 'error');
        return;
      }
      if (!['video/mp4', 'video/quicktime', 'application/mp4', ''].includes(file.type)) {
        setStatus(copy.invalid, 'error');
        return;
      }
    }
    incoming.forEach((file) => clips.push({ file, engineName: null }));
    input.value = '';
    invalidateAnalysis();
    renderFiles();
    setStatus(clips.length < 2 ? copy.selectionRequired : copy.ready, clips.length < 2 ? 'warning' : '');
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-video-runtime="${url}"]`);
      if (existing) {
        if (window.FFmpegWASM?.FFmpeg) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.dataset.videoRuntime = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error('runtime-download'));
      document.head.append(script);
    });
  }

  async function toBlobURL(url, type) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error('runtime-download');
    return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type }));
  }

  async function loadEngine() {
    if (ffmpeg) return ffmpeg;
    if (!enginePromise) {
      enginePromise = (async () => {
        setStatus(copy.library, 'busy');
        await loadScript(FFmpegScript);
        const FFmpegClass = window.FFmpegWASM?.FFmpeg;
        if (!FFmpegClass) throw new Error('runtime-api');
        const instance = new FFmpegClass();
        instance.on('log', ({ message }) => {
          if (activeLogs) activeLogs.push(String(message));
        });
        const coreURL = await toBlobURL(`${FFmpegBase}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${FFmpegBase}/ffmpeg-core.wasm`, 'application/wasm');
        await instance.load({ coreURL, wasmURL });
        ffmpeg = instance;
        return instance;
      })().catch((error) => {
        enginePromise = null;
        throw error;
      });
    }
    return enginePromise;
  }

  function parseDuration(log) {
    const match = log.match(/Duration:\s*(\d{2}):(\d{2}):([\d.]+)/);
    return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : NaN;
  }

  function parseProbe(log) {
    const lines = log.split(/\r?\n/);
    const videoLine = lines.find((line) => /Stream #\d+:\d+.*Video:/.test(line));
    const audioLine = lines.find((line) => /Stream #\d+:\d+.*Audio:/.test(line));
    const dimensionMatch = videoLine?.match(/(\d{2,5})x(\d{2,5})(?=\s|,|$)/);
    if (!videoLine || !audioLine || !dimensionMatch) {
      if (videoLine && !audioLine) throw new Error('missing-audio');
      throw new Error('bad-video');
    }
    let width = Number(dimensionMatch[1]);
    let height = Number(dimensionMatch[2]);
    const rotation = log.match(/rotation of\s*(-?[\d.]+) degrees/i);
    if (rotation && Math.round(Math.abs(Number(rotation[1]))) % 180 === 90) [width, height] = [height, width];
    const duration = parseDuration(log);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('bad-video');
    if (duration > MAX_DURATION) throw new Error('too-long');
    return { duration, width, height };
  }

  async function probeClip(clip) {
    const logs = [];
    activeLogs = logs;
    try { await ffmpeg.exec(['-hide_banner', '-i', clip.engineName]); }
    catch (_) { /* FFmpeg prints stream details before the expected missing-output exit. */ }
    finally { activeLogs = null; }
    return parseProbe(logs.join('\n'));
  }

  async function detectSilences(clip, settings) {
    const logs = [];
    activeLogs = logs;
    try {
      await ffmpeg.exec(['-hide_banner', '-nostats', '-i', clip.engineName, '-vn', '-af', `silencedetect=noise=${settings.noiseDb}dB:d=${settings.minSilence}`, '-f', 'null', '-']);
    } finally { activeLogs = null; }
    const events = [];
    logs.forEach((line) => {
      const start = line.match(/silence_start:\s*(-?[\d.]+)/);
      const end = line.match(/silence_end:\s*(-?[\d.]+)/);
      if (start) events.push({ type: 'start', time: Number(start[1]) });
      if (end) events.push({ type: 'end', time: Number(end[1]) });
    });
    const silences = [];
    let start = null;
    events.forEach((event) => {
      if (event.type === 'start') start = Math.max(0, event.time);
      else {
        silences.push([start === null ? 0 : start, event.time]);
        start = null;
      }
    });
    if (start !== null) silences.push([start, clip.info.duration]);
    return silences;
  }

  function speechRanges(silences, duration, settings) {
    let cursor = 0;
    let speech = [];
    silences.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
      if (start - cursor > 0.001) speech.push([cursor, start]);
      cursor = Math.max(cursor, end);
    });
    if (duration - cursor > 0.001) speech.push([cursor, duration]);
    speech = speech.filter(([start, end]) => end - start >= 0.15);

    if (speech.length > 1) {
      const [start, end] = speech[0];
      if (start < 0.15 && end - start < 1.2 && speech[1][0] - end >= 1) speech.shift();
    }
    if (speech.length > 1) {
      const [start, end] = speech[speech.length - 1];
      if (duration - end < 0.15 && end - start < 1.2 && start - speech[speech.length - 2][1] >= 1) speech.pop();
    }

    const merged = [];
    speech.forEach(([start, end]) => {
      const previous = merged[merged.length - 1];
      if (previous && start - previous[1] < settings.joinPause) previous[1] = end;
      else merged.push([start, end]);
    });
    return merged.filter(([start, end]) => end - start >= 0.6);
  }

  function getSettings() {
    const number = (inputEl, fallback, min, max) => {
      const value = Number(inputEl.value);
      return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    };
    return {
      fade: number(fadeInput, 0.5, 0.1, 1.5),
      joinPause: number(pauseInput, 0.8, 0.2, 2),
      marginStart: number(marginStartInput, 0.35, 0, 1.5),
      marginEnd: number(marginEndInput, 0.4, 0, 1.5),
      noiseDb: -35,
      minSilence: 0.4
    };
  }

  function createCutsList() {
    cutsList.replaceChildren();
    analysis.clips.forEach((clip, index) => {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      heading.textContent = `${copy.clip} ${index + 1}: ${clip.file.name}`;
      const detail = document.createElement('span');
      if (clip.fallback) detail.textContent = `${copy.noSpeech} ${formatDuration(clip.info.duration)}`;
      else if (Math.abs(clip.start) < 0.005 && Math.abs(clip.end - clip.info.duration) < 0.005) detail.textContent = `${copy.full} ${formatDuration(clip.info.duration)}`;
      else detail.textContent = isEnglish
        ? `Keeps ${formatSeconds(clip.start)}–${formatSeconds(clip.end)} (${formatDuration(clip.end - clip.start)}); trims ${formatDuration(clip.start + clip.info.duration - clip.end)} at the edges.`
        : `Mantém ${formatSeconds(clip.start)}–${formatSeconds(clip.end)} (${formatDuration(clip.end - clip.start)}); remove ${formatDuration(clip.start + clip.info.duration - clip.end)} nas bordas.`;
      item.append(heading, detail);
      cutsList.append(item);
    });
    results.classList.remove('utility-hidden');
  }

  async function analyzeClips() {
    if (running) return;
    if (clips.length < 2) {
      setStatus(copy.selectionRequired, 'warning');
      return;
    }
    const runId = ++currentRun;
    invalidateAnalysis();
    setWorking(true);
    try {
      await loadEngine();
      setStatus(copy.working, 'busy');
      await removeEngineFiles();
      for (let index = 0; index < clips.length; index += 1) {
        const clip = clips[index];
        clip.engineName = `clip-${index}.${clip.file.name.split('.').pop().toLowerCase()}`;
        await ffmpeg.writeFile(clip.engineName, new Uint8Array(await clip.file.arrayBuffer()));
      }
      const settings = getSettings();
      let totalDuration = 0;
      for (let index = 0; index < clips.length; index += 1) {
        if (runId !== currentRun) return;
        const clip = clips[index];
        setStatus(copy.analyzing(index + 1, clips.length), 'busy');
        clip.info = await probeClip(clip);
        totalDuration += clip.info.duration;
        if (totalDuration > MAX_TOTAL_DURATION) throw new Error('total-too-long');
        const silences = await detectSilences(clip, settings);
        const speech = speechRanges(silences, clip.info.duration, settings);
        clip.fallback = speech.length === 0;
        clip.start = speech.length ? Math.max(0, speech[0][0] - settings.marginStart) : 0;
        clip.end = speech.length ? Math.min(clip.info.duration, speech[speech.length - 1][1] + settings.marginEnd) : clip.info.duration;
        if (clip.end - clip.start < 0.5) {
          clip.start = 0;
          clip.end = clip.info.duration;
          clip.fallback = true;
        }
      }
      if (runId !== currentRun) return;
      const minDuration = Math.min(...clips.map((clip) => clip.end - clip.start));
      analysis = { clips: clips.slice(), settings, fade: Math.min(settings.fade, 0.45 * minDuration) };
      createCutsList();
      createButton.disabled = false;
      setStatus(copy.doneAnalysis, '');
      window.higienizadorTrack?.('tool_analysis_completed', { tool: 'video_joiner' });
    } catch (error) {
      const message = error?.message || '';
      if (message === 'missing-audio') setStatus(copy.noAudio, 'error');
      else if (message === 'too-long') setStatus(copy.tooLong, 'error');
      else if (message === 'total-too-long') setStatus(copy.totalTooLong, 'error');
      else if (/memory|allocation/i.test(message)) setStatus(copy.memoryError, 'error');
      else if (message === 'bad-video') setStatus(copy.badVideo, 'error');
      else setStatus(ffmpeg ? (isEnglish ? 'Analysis failed. Try a smaller MP4/MOV with audio.' : 'A análise falhou. Tente um MP4/MOV menor, com áudio.') : copy.libraryError, 'error');
      analysis = null;
    } finally {
      if (runId === currentRun) setWorking(false);
    }
  }

  function buildFilterGraph(items, width, height, fade) {
    const filters = [];
    const durations = [];
    items.forEach((clip, index) => {
      const start = clip.start.toFixed(3);
      const end = clip.end.toFixed(3);
      const length = clip.end - clip.start;
      durations.push(length);
      filters.push(`[${index}:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${index}]`);
      filters.push(`[${index}:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[a${index}]`);
    });
    let videoLabel = 'v0';
    let audioLabel = 'a0';
    let totalDuration = durations[0];
    for (let index = 1; index < items.length; index += 1) {
      const offset = Math.max(0, totalDuration - fade);
      filters.push(`[${videoLabel}][v${index}]xfade=transition=fade:duration=${fade.toFixed(3)}:offset=${offset.toFixed(3)}[xv${index}]`);
      filters.push(`[${audioLabel}][a${index}]acrossfade=d=${fade.toFixed(3)}[xa${index}]`);
      videoLabel = `xv${index}`;
      audioLabel = `xa${index}`;
      totalDuration += durations[index] - fade;
    }
    return { graph: filters.join(';'), videoLabel, audioLabel };
  }

  async function createVideo() {
    if (running || !analysis || !ffmpeg) return;
    const runId = ++currentRun;
    setWorking(true);
    setStatus(copy.creating, 'busy');
    try {
      const first = analysis.clips[0].info;
      const width = Math.max(2, first.width - (first.width % 2));
      const height = Math.max(2, first.height - (first.height % 2));
      const { graph, videoLabel, audioLabel } = buildFilterGraph(analysis.clips, width, height, analysis.fade);
      const args = ['-y'];
      analysis.clips.forEach((clip) => args.push('-i', clip.engineName));
      args.push('-filter_complex', graph, '-map', `[${videoLabel}]`, '-map', `[${audioLabel}]`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'joined-output.mp4');
      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile('joined-output.mp4');
      if (runId !== currentRun) return;
      const blob = new Blob([data], { type: 'video/mp4' });
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      outputUrl = URL.createObjectURL(blob);
      video.src = outputUrl;
      downloadLink.href = outputUrl;
      preview.classList.remove('utility-hidden');
      setStatus(copy.createReady, '');
      window.higienizadorTrack?.('tool_clean_completed', { tool: 'video_joiner' });
    } catch (error) {
      const message = error?.message || '';
      if (/memory|allocation/i.test(message)) setStatus(copy.memoryError, 'error');
      else setStatus(copy.renderError, 'error');
    } finally {
      if (runId === currentRun) setWorking(false);
    }
  }

  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', () => addFiles(input.files || []));
  resetButton.addEventListener('click', resetClips);
  analyzeButton.addEventListener('click', analyzeClips);
  createButton.addEventListener('click', createVideo);
  [fadeInput, pauseInput, marginStartInput, marginEndInput].forEach((field) => field.addEventListener('input', () => {
    if (!analysis) return;
    invalidateAnalysis();
    setStatus(isEnglish ? 'Settings changed. Analyze the cuts again before creating the video.' : 'Os ajustes mudaram. Analise os cortes novamente antes de criar o vídeo.', 'warning');
  }));
  ['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
  }));
  dropzone.addEventListener('drop', (event) => addFiles(event.dataTransfer?.files || []));
  downloadLink.addEventListener('click', () => {
    window.higienizadorTrack?.('tool_result_downloaded', { tool: 'video_joiner' });
  });
  window.addEventListener('pagehide', () => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    if (ffmpeg) ffmpeg.terminate();
  }, { once: true });
})();
