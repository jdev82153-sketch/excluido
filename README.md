# LeadBR V1

Ferramenta de prospecÃ§Ã£o de leads para empresas de todo o Brasil.

## Como usar

1. Publique `index.html`, `style.css` e `script.js` no GitHub Pages.
2. Abra **API / ConfiguraÃ§Ã£o**.
3. Informe a URL do seu backend/proxy.
4. Sua API deve aceitar `GET` com:
   - `segment`
   - `city`
   - `state`
   - `limit`
5. Retorne JSON no formato:
```json
{"leads":[{"name":"Empresa","city":"SÃ£o Paulo","state":"SP","phone":"+5511999999999","whatsapp":"5511999999999","website":"https://empresa.com","instagram":"https://instagram.com/empresa","rating":4.7,"reviews":83}]}
```

## SeguranÃ§a

NÃ£o coloque uma chave privada de Google Places, SerpAPI etc. no JavaScript pÃºblico. Use um backend/proxy e coloque somente a URL pÃºblica desse proxy no painel.

A V1 possui dados de demonstraÃ§Ã£o quando nenhuma API estÃ¡ configurada.
