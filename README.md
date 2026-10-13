# LimpaMeta

Site estático em português para reexportar JPEG, PNG e WebP no próprio navegador, sem enviar os arquivos a um servidor.

## Executar localmente

Abra `index.html` em um navegador moderno ou rode um servidor estático na pasta. Não há dependências de build.

## Publicar no Cloudflare Pages

1. Crie um projeto Pages apontando para este repositório.
2. Como o site é estático, deixe o comando de build vazio e defina a pasta de saída como `/` (raiz do projeto).
3. Após o primeiro deploy, adicione `clean-ai.ferramentasgratis.com` como domínio personalizado nas configurações do projeto Pages.
4. No Cloudflare DNS, crie/aceite o registro CNAME indicado pelo painel do Pages. Confirme HTTPS ativo antes de divulgar.

## Limitações

- HEIC/HEIF, TIFF e vídeo não são aceitos.
- A reexportação via canvas pode recomprimir imagens e alterar levemente qualidade, cor ou tamanho.
- Remove os metadados do arquivo de saída que o navegador não replica; não remove watermark incorporada aos pixels, como SynthID, e não impede análise visual ou outros sinais de plataforma.
- Suporte a downloads em lote depende das permissões de download múltiplo do navegador; se o navegador bloquear, baixe os itens individualmente.
- Imagens acima de 40 megapixels são recusadas para reduzir o risco de falta de memória no aparelho.


