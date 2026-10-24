# Higienizador IA

Site estático bilíngue para higienizar metadados comuns de imagens, vídeos MP4/MOV e documentos, caracteres invisíveis em textos e parâmetros de links, além de juntar clipes com cortes automáticos nas bordas e transições selecionáveis: corte seco, dissolução ou passagem pelo preto. Os arquivos selecionados são processados no navegador; não há API de processamento.

## Rodar localmente

Abra `index.html` num navegador moderno ou use um servidor estático na pasta. Não há etapa de build nem dependências de pacote.

## Publicação

O projeto é publicado no Cloudflare Pages a partir da branch `main` do repositório `allyssons/cleanai`; novos commits em `main` acionam o deploy.

Arquivos de SEO na raiz:

- `robots.txt` permite rastreamento e aponta para `sitemap.xml`.
- `sitemap.xml` lista a página inicial e as páginas públicas canônicas.
- As páginas HTML têm títulos, descrições e URLs canônicas próprias.

## Google AdSense

O código oficial do Google AdSense para anúncios automáticos está no `<head>` da página inicial e das páginas de ferramentas e guias. O publisher ID é `ca-pub-1803254373578705`; a exibição depende de o Google aprovar o site e das configurações de Auto ads na conta. Os espaços manuais `data-ad-slot="content-1"` e `data-ad-slot="content-2"` continuam ocultos e não são unidades do AdSense.

A política `privacidade.html` informa sobre cookies, personalização de anúncios e opções de privacidade. O `ads.txt` oficial está incluído na raiz do repositório para ser servido por `https://ferramentasgratis.com/ads.txt`. Mantenha as mensagens de consentimento e configurações de privacidade do Google atualizadas para as regiões e fornecedores usados.

## Limites das ferramentas

- Imagens: JPEG, PNG e WebP; reexportar pode recomprimir JPEG e alterar levemente tamanho, cor ou qualidade. HEIC/HEIF e TIFF não são aceitos.
- Metadados de vídeo: MP4/MOV de até 200 MB; a limpeza é limitada aos campos reconhecidos. Credenciais C2PA reconhecíveis bloqueiam a limpeza e marcas d'água nos quadros não são removidas.
- Juntador de vídeos: 2 a 6 arquivos MP4/MOV com áudio, até 200 MB por clipe, 500 MB no total e 15 minutos combinados. A saída é recodificada localmente para MP4; o visitante pode escolher corte seco, dissolução ou passagem pelo preto. O motor FFmpeg WebAssembly pode usar bastante memória e levar tempo, especialmente em celulares. Os clipes escolhidos não são enviados ao site nem ao CDN.
- Metadados: remove dados que o navegador não replica ao reexportar; não remove marcas d'água incorporadas aos pixels nem garante rótulos de plataformas.
- Textos: texto colado ou arquivo `.txt`/`.md` de até 1 MB, com limite de 20.000 palavras. A ferramenta limpa caracteres Unicode invisíveis comuns e normaliza espaços especiais; não reescreve, não detecta autoria e não remove marcas estatísticas baseadas na escolha das palavras.
- Juntadores importantes para idiomas e emojis são preservados por padrão. Remover controles de direção é uma opção avançada que pode alterar a exibição de idiomas RTL.

## FFmpeg WebAssembly e licenças

A interface do juntador usa o wrapper `@ffmpeg/ffmpeg` 0.12.15, incluído em `vendor/ffmpeg/` sob licença MIT. Ao iniciar a análise, o navegador baixa sob demanda o núcleo `@ffmpeg/core` 0.12.10 pelo jsDelivr; o núcleo está sob GPL-2.0-or-later. Os avisos, textos das licenças e links para o código-fonte estão em [vendor/ffmpeg/README.md](vendor/ffmpeg/README.md). O núcleo não fica armazenado neste repositório.

## Google Analytics 4

A propriedade do Higienizador IA tem um fluxo da Web para `https://ferramentasgratis.com/`, com ID de medição `G-YXQQQTREZX`. O arquivo `privacy-consent.js` controla a etiqueta em todas as páginas: sem escolha ou após recusa, a etiqueta do Google Analytics não é carregada; a aceitação é registrada localmente por até 180 dias e pode ser revista pelo botão no rodapé. A configuração `cookie_domain: none` limita os cookies do GA4 ao hostname atual. A recusa ou retirada da escolha desativa a medição e tenta remover os cookies `_ga` deste navegador. A configuração do GA4 não envia os conteúdos das imagens ou textos processados.
