# Roteiro do vídeo de demonstração (≤ 3 min, em inglês)

Segue a ordem de `specs/05-aceite.md`. A ideia é **gravar a tela sem falar**, uma cena por vez, e depois colocar uma **narração gerada** por cima: o Claude escreve o texto, e uma ferramenta de voz (text-to-speech) lê.

## Preparação antes de gravar

- **App:** `make up ARGS="--reset"` (devnet, banco limpo). Carteiras abastecidas conforme `01-carteira-devnet.md`.
- **Navegador:**
  - janela em 1920×1080, zoom de 110 a 125% para o texto ficar legível no vídeo;
  - barra de favoritos e extensões ocultas;
  - app em **inglês (EN)** e com o mesmo tema (claro ou escuro) do começo ao fim.
- **Duas janelas:** Ana (normal) e Carlos (anônima), já logadas.
- **Phantom:** em **Devnet**, conta "Cliente" selecionada.
- **Dados prontos:** deixe criada antes uma fatura de 1,00 USDC (cena 3) e uma de 3,00 USDC (cena 4), para não perder tempo no vídeo.
- **Esperas:** a confirmação na devnet leva ~15–30 s. Grave a espera inteira e corte na edição.

## Cenas, ações na tela e narração

A narração tem ~2,5 palavras por segundo, o ritmo das vozes de TTS. Se uma cena ficar mais longa que a fala, acelere o clipe na edição.

| # | Tempo | Na tela (sem falar) | Narração (inglês) |
|---|---|---|---|
| 1 | 0:00–0:15 | Página inicial do PayTrail; rolar até os recursos | "Brazilian freelancers are getting paid in USDC from clients abroad. But at the end of the month, nobody knows what was earned in reais, and the accountant gets a pile of screenshots. PayTrail fixes that." |
| 2 | 0:15–0:45 | Ana cria a fatura "Landing page — Acme Inc" de 2 USDC → abre o link público com QR code → Phantom (Cliente) lê o QR e aprova → corte → página vira **Paid** → detalhe da fatura com método Reference, valor em BRL e link do explorer | "Ana creates an invoice and shares a Solana Pay link. Her client scans the QR code with any wallet and pays in USDC. PayTrail watches the chain, matches the payment to the invoice automatically, and converts it to reais at the official Central Bank rate." |
| 3 | 0:45–1:15 | Fatura de 1 USDC → Phantom (Exchange) faz **Send** do valor exato, sem o link → fatura **Paid** com método Unique amount → fatura de 3 USDC paga em parte → 0,57 avulso aparece em **Unmatched** → Ana associa à fatura → evento Manual match na linha do tempo | "Not every client uses the link. When money comes from an exchange, PayTrail still finds the invoice by its unique amount. Partial payments keep a running balance, and anything it can't match goes to a review queue, where Ana links it in one click." |
| 4 | 1:15–1:35 | Ana gera o comprovante → abre o link `/verify/…` em janela anônima → **Valid** | "Every paid invoice gets a receipt with a SHA-256 fingerprint. Anyone can verify it publicly, and any change to the document breaks the match." |
| 5 | 1:35–2:20 | Ana busca "crypto" no diretório → abre o chat com Carlos → mensagem chega na janela do Carlos → Carlos envia proposta "R$ 150/month, Oct–Dec 2026" → Ana aceita → mensagem de sistema | "Ana also needs an accountant who understands crypto. She finds Carlos in the directory and they talk right inside PayTrail. Carlos sends a proposal with his fee and the period he needs to see. Ana accepts, and he gets read-only access, only to that period." |
| 6 | 2:20–2:50 | Carlos → My clients → Ana → relatório mensal (totais em USDC e BRL, regra de câmbio, links on-chain) → Export CSV → janela da Ana mostra o registro de acessos | "On his side, Carlos sees Ana's monthly report in reais, with every on-chain transaction linked, and exports it to CSV. Every view is logged, and Ana can revoke access at any time." |
| 7 | 2:50–3:00 | Logo do PayTrail / página inicial | "PayTrail. Your payment trail, accountant-ready. Built on Solana." |

## Como gravar sem falar e pôr a voz depois

### 1. Gravar a tela (sem áudio)
- **OBS Studio** (grátis, [obsproject.com](https://obsproject.com)), o recomendado: fonte "Captura de janela" do navegador, 1920×1080, 30 fps, saída MP4, áudio desligado. Um arquivo por cena.
- **Alternativa rápida:** Xbox Game Bar do Windows (`Win + Alt + R` inicia e para a gravação da janela ativa). Desligue o microfone no painel.
- Grave **cada cena separada**, com 2–3 s de folga no início e no fim.

### 2. Gerar a narração (o "Claude falando")
O Claude não produz áudio sozinho: ele escreve o texto (a coluna "Narração" acima) e uma ferramenta de voz lê. Opções, da mais simples à mais natural:

| Opção | Custo | Como |
|---|---|---|
| **Clipchamp** (vem no Windows 11) | Grátis | No editor: **Gravar e criar → Conversão de texto em fala**, idioma English (US), cole o texto de cada cena, escolha a voz e a velocidade. O áudio já entra na linha do tempo. |
| **edge-tts** (vozes neurais da Microsoft, via Python) | Grátis | O Claude pode gerar aqui um MP3 por cena (ex.: voz `en-US-AndrewNeural`). O texto da narração é enviado ao serviço de voz da Microsoft. |
| **ElevenLabs** | Plano grátis limitado | A voz mais natural: cole o texto de cada cena e baixe os MP3s. |

Dica: gere **um áudio por cena**. Fica fácil encaixar e refazer só um trecho.

### 3. Montar o vídeo
1. No **Clipchamp** (ou CapCut), coloque os clipes na ordem e cada áudio sob a sua cena.
2. Ajuste o clipe ao áudio: corte as esperas e use a velocidade do clipe (1,25×–2×) nas partes de digitação ou de confirmação da transação.
3. Opcional: legendas automáticas (Clipchamp → **Legendas**) e uma trilha de fundo baixa (−25 dB).
4. Exporte em **1080p MP4** e confira a duração (**≤ 3:00**).

### Checklist final
- [ ] Todo o app em inglês, sem e-mails ou senhas reais visíveis
- [ ] Rede **Devnet** aparecendo na Phantom (é uma demo de teste)
- [ ] Narração alinhada com a ação de cada cena
- [ ] Duração ≤ 3 min, 1080p
