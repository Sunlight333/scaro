# Guia de edição · SACRO Links

Este guia mostra como mudar os links, botões, ícones, a imagem de Novidades e a música do site **sem instalar nada**, pelo celular ou pelo computador.

Tudo o que aparece na página fica em **um único arquivo: `links.json`**. Você edita esse arquivo no GitHub, salva, e o site se atualiza sozinho em cerca de 1 minuto.

> **Fique tranquilo:** se algo der errado, o site continua no ar mostrando os links padrão, e o GitHub guarda todas as versões anteriores (dá para desfazer qualquer mudança, veja o passo 11).

---

## 1. Abrir o arquivo para editar

1. Entre em **github.com** pelo navegador (Chrome ou Safari) e faça login.
   *O aplicativo do GitHub não edita arquivos. Use o navegador.*
2. Abra o repositório **sacro-links**.
3. Toque no arquivo **`links.json`**.
4. Toque no **ícone de lápis ✏️** (canto superior direito do arquivo, "Edit this file").

Você vai ver algo assim:

```json
{
  "welcome": "Seja bem-vindo inspirado(a)",
  "social": [
    { "name": "spotify",   "url": "https://open.spotify.com/user/31elwa64kndcyqyg2b7wbxo67h3a", "show": true },
    { "name": "instagram", "url": "https://www.instagram.com/use.sacro", "show": true },
    { "name": "tiktok",    "url": "https://www.tiktok.com/@use.sacro", "show": true },
    { "name": "youtube",   "url": "", "show": false },
    { "name": "discord",   "url": "", "show": false }
  ],
  "buttons": [
    { "label": "LOJA ONLINE", "url": "https://usesacro.com.br/produto/" },
    { "label": "GRUPO VIP",   "url": "https://chat.whatsapp.com/IR19nRUUWBLHm8HcfKgQv2" },
    { "label": "SUPORTE",     "url": "https://wa.me/5531971384704" }
  ],
  "novidades": { "title": "NOVIDADES", "image": "", "url": "" },
  "music": {
    "enabled": true,
    "file": "assets/trilha.mp3",
    "credit": "“Miserere mei, Deus” (Gregorio Allegri) · Ensamble Escénico Vocal, ...",
    "creditUrl": "https://commons.wikimedia.org/wiki/File:Allegri_-_..."
  },
  "neon": "estatico"
}
```

## 2. As 3 regras de ouro

1. **Mude só o que está entre aspas** `"assim"`. Não apague as aspas.
2. **Entre um bloco `{ ... }` e outro vai uma vírgula.** O último bloco da lista **não** tem vírgula depois dele.
3. Na dúvida, **copie um bloco que já funciona** e altere só o texto.

## 3. Trocar um link

Ache o botão ou ícone e troque **só o texto entre aspas depois de `"url":`**.

Antes:
```json
{ "label": "GRUPO VIP", "url": "https://chat.whatsapp.com/IR19nRUUWBLHm8HcfKgQv2" },
```
Depois:
```json
{ "label": "GRUPO VIP", "url": "https://chat.whatsapp.com/NOVOLINKDOGRUPO" },
```

Dica: o site remove sozinho os códigos de rastreio que o Instagram, o TikTok e o Spotify colam no fim dos links (`?si=`, `?igsh=`, `utm_...`). Pode colar o link como vier.

## 4. Mudar o texto de um botão

Troque o texto depois de `"label":`. Ele aparece em letras maiúsculas no site.

```json
{ "label": "LOJA ONLINE", "url": "https://usesacro.com.br/produto/" },
```

## 5. Adicionar um botão

1. Copie uma linha de botão inteira, do `{` até o `}`.
2. Cole logo abaixo.
3. Troque o `label` e a `url`.
4. **Confira as vírgulas:** todas as linhas têm vírgula no final, **menos a última** da lista.

```json
"buttons": [
  { "label": "LOJA ONLINE", "url": "https://usesacro.com.br/produto/" },
  { "label": "GRUPO VIP",   "url": "https://chat.whatsapp.com/IR19nRUUWBLHm8HcfKgQv2" },
  { "label": "SUPORTE",     "url": "https://wa.me/5531971384704" },
  { "label": "LOOKBOOK",    "url": "https://usesacro.com.br/lookbook/" }
],
```

Os botões aparecem na mesma ordem da lista. Não há limite de quantidade.

## 6. Remover um botão

Apague a linha inteira do botão, do `{` até o `}` (e a vírgula dela). Se você apagou o último da lista, **tire a vírgula** da linha que ficou por último.

## 7. Ligar o YouTube ou o Discord

Cole o link entre as aspas de `"url"` e troque `false` por `true` (sem aspas):

```json
{ "name": "youtube", "url": "https://www.youtube.com/@use.sacro", "show": true },
```

Para esconder um ícone de novo, troque `true` por `false`. Um ícone só aparece se `show` for `true` **e** a `url` estiver preenchida.

## 8. Card de Novidades

O card tem um título, uma imagem e um link. Enquanto a `url` estiver vazia (`""`), o card aparece, mas não é clicável. Sem imagem, ele mostra o logo SACRO.

**Colocar ou trocar a imagem:**

1. Prepare a imagem: **1200 × 560 pixels**, JPG ou WebP, **até 200 KB** (use squoosh.app para diminuir o tamanho). As bordas podem ser cortadas um pouco no celular, então deixe o principal no centro.
2. Renomeie o arquivo para **`novidades.jpg`**.
3. No GitHub, abra a pasta **`assets`** → **Add file** → **Upload files** → escolha a imagem → **Commit changes**.
   Se já existir um `novidades.jpg`, o novo substitui o antigo.
4. **Só na primeira vez:** no `links.json`, escreva o caminho da imagem:

```json
"novidades": { "title": "NOVIDADES", "image": "assets/novidades.jpg", "url": "https://usesacro.com.br/colecao-nova/" },
```

Das próximas vezes, basta repetir os passos 2 e 3 com a imagem nova.

## 9. Música de fundo

A música começa baixinho quando o visitante toca na página pela primeira vez, e ele pode silenciar pelo botão 🔈 no canto inferior esquerdo. O site lembra a escolha dele.

Ela toca no computador e no celular, inclusive no iPhone com o modo silencioso ligado, e **continua tocando em segundo plano** quando o visitante abre um link em outra aba ou bloqueia a tela. No celular aparece o controle "Trilha sonora · SACRO" na tela de bloqueio e nas notificações, onde dá para pausar.

**Quando a música para (e não dá para evitar):** dentro do navegador do Instagram ou do TikTok, ao tocar em um link o próprio app troca a página, e ao abrir o WhatsApp o navegador vai para segundo plano. Nesses casos o sistema do celular fecha ou pausa a página. Quando a pessoa volta, basta tocar na página para a música continuar.

- **Desligar a música:** troque `"enabled": true` por `"enabled": false`.
- **Ligar de novo:** volte para `true`.

**Não apague o `credit` nem o `creditUrl`.** A licença da gravação (CC BY) exige esse crédito, que aparece em letras pequenas no fim da página.

Se trocar a música, ela precisa ser de **domínio público ou com licença que permita uso comercial**. Músicas comuns do Spotify ou YouTube **não podem** ser usadas. Fale com o desenvolvedor antes de trocar o arquivo. As outras duas opções aprovadas, com os créditos prontos, estão no arquivo `FONTES.md` que acompanha as músicas.

## 10. Salvar e publicar

1. Toque no botão verde **Commit changes...**
2. Na janela que abrir, toque de novo em **Commit changes**.
3. Espere cerca de 1 minuto e abra o site. Se ainda estiver igual, atualize a página.

### Conferir se ficou tudo certo

Abra o site com **`?verificar`** no final do endereço:

**https://links.usesacro.com.br/?verificar**

Aparece um aviso no topo da página:

- ✔ **verde:** o arquivo está correto.
- ⚠ **amarelo:** o arquivo funciona, mas algum item foi ignorado (por exemplo, um botão sem link). O aviso diz qual.
- ✖ **vermelho:** tem um erro de digitação (normalmente uma vírgula ou aspas faltando). O site continua funcionando com os links padrão até você corrigir. O aviso mostra o trecho com problema.

## 11. Desfazer uma mudança

1. Abra o `links.json` no GitHub e toque em **History** (ícone de relógio).
2. Toque na versão anterior que estava boa e depois em **View file** (ou nos três pontinhos → **View file**).
3. Toque em **Raw**, selecione e copie todo o texto.
4. Volte para o `links.json`, toque no lápis ✏️, apague tudo, cole o texto copiado e faça o **Commit changes**.

## 12. Efeito neon dos botões

Existem dois estilos. O site usa o **estático**, escolhido por você:

- `"neon": "estatico"`: brilho fixo, sem movimento (atual).
- `"neon": "animado"`: uma luz percorre a borda dos botões.

Para comparar: **links.usesacro.com.br/?neon=estatico** e **links.usesacro.com.br/?neon=animado**

Quem usa o celular no modo "reduzir movimento" sempre vê o estilo estático.

## 13. Ver os cliques (Google Analytics)

1. Entre em **analytics.google.com** com a conta da SACRO.
2. **Tempo real:** menu **Relatórios → Tempo real**. Mostra quem está no site agora e os cliques (`link_click`).
3. **Cliques por link:** menu **Explorar → Cliques por link**. Mostra quantas vezes cada botão, ícone e o card de Novidades foram clicados, por período.
4. **Música:** o evento `music_play` conta quem ouviu a trilha e `music_mute` conta quem silenciou.

Os números só incluem quem aceitou o aviso de cookies, conforme a LGPD.

---

### Precisa de ajuda?

Se algo não funcionar, não se preocupe: o site continua no ar. Fale com o desenvolvedor, que pode ver o histórico de mudanças e corrigir em minutos.
