# Higienizador IA

Ferramenta estática em português para higienizar metadados de imagens e caracteres invisíveis em textos. O conteúdo selecionado é processado no navegador; não há API de processamento.

## Rodar localmente

Abra `index.html` num navegador moderno ou use um servidor estático na pasta. Não há etapa de build nem dependências de pacote.

## Publicação

O projeto é publicado no Cloudflare Pages a partir da branch `main` do repositório `allyssons/cleanai`. O projeto Pages está conectado ao domínio `clean-ai.ferramentasgratis.com`; novos commits em `main` acionam o deploy.

Arquivos de SEO na raiz:

- `robots.txt` permite rastreamento e aponta para `sitemap.xml`.
- `sitemap.xml` lista a página inicial e as páginas públicas canônicas.
- As páginas HTML têm títulos, descrições e URLs canônicas próprias.

## Espaços preparados para publicidade

O HTML inclui duas unidades inativas, `data-ad-slot="content-1"` e `data-ad-slot="content-2"`, posicionadas longe dos botões de seleção, limpeza, cópia e download. Elas permanecem ocultas enquanto a publicidade não estiver configurada.

Antes de ativar uma rede de anúncios:

1. Escolha o provedor, crie as unidades e substitua os espaços reservados por seus IDs reais.
2. Revise `privacidade.html` para nomear fornecedores, cookies/identificadores e opções de desativação pertinentes.
3. Configure uma CMP certificada e integrada ao TCF antes de servir anúncios personalizados a visitantes do EEE, Reino Unido ou Suíça, se usar Google AdSense/Ad Manager.
4. Crie `ads.txt` somente com a linha e o publisher ID reais fornecidos pela conta de anúncios. Não publique um ID de exemplo.
5. Faça a revisão e a aprovação do domínio no painel do provedor antes de considerar os anúncios ativos.

As unidades têm dimensões mínimas definidas em `styles.css` quando exibidas, para reservar espaço e limitar deslocamentos de layout. Não carregue scripts do provedor enquanto os slots estiverem inativos.

## Limites das ferramentas

- Imagens: JPEG, PNG e WebP; reexportação pode recomprimir o JPEG e alterar levemente tamanho, cor ou qualidade. HEIC/HEIF, TIFF e vídeo não são aceitos.
- Metadados: remove os dados que o navegador não replica ao reexportar; não remove marcas d'água incorporadas aos pixels nem garante rótulos de plataformas.
- Textos: aceita texto colado ou arquivo `.txt`/`.md` de até 1 MB, com limite de 20.000 palavras. Limpa caracteres Unicode invisíveis comuns e normaliza espaços especiais; não reescreve, não detecta autoria e não remove marcas estatísticas baseadas na escolha das palavras.
- Juntadores importantes para idiomas e emojis são preservados por padrão. Remover controles de direção é uma opção avançada que pode alterar a exibição de idiomas RTL.
