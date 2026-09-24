# Bichinhos 🐥🐘🦁🦉

Rotina de dormir em 3D para crianças de 0 a 2 anos, usada pelos pais junto com a criança.
De dia os bichinhos brincam; à noite todos dormem, menos a corujinha.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (ex.: http://localhost:5173).
Para testar no celular na mesma rede Wi‑Fi, use o endereço "Network" mostrado no terminal.

## Publicar

O projeto é Vite puro, então o Vercel detecta tudo sozinho:
1. Suba o projeto para um repositório no GitHub.
2. No Vercel, "Add New → Project" e importe o repositório (preset: Vite, build `npm run build`, saída `dist`).
3. Cada push na branch principal publica uma versão nova.

## Estrutura

```
index.html              marcação da página (botões, céu, balões)
src/main.js             cena, câmera, controles, regras dia/noite e loop de animação
src/style.css           visual da interface e do céu
src/sky.js              sol, entardecer, lua e estrelas (camadas em CSS)
src/audio.js            sons dos bichos e músicas (tudo gerado com Web Audio)
src/world.js            os planetinhos (fazenda ativa; savana e floresta guardadas para depois)
src/materials.js        materiais e olhinhos compartilhados
src/characters/*.js     patinho, elefante, leãozinho e corujinha
```

## Regras da rotina (MVP)

- Os pais escolhem o bichinho no menu de baixo (ou setas do teclado) e ligam a noite no botão 🌙 (ou tecla N).
- De dia: o bichinho anda para onde se aponta e reage ao toque.
- À noite: o céu escurece aos poucos, o bichinho boceja e dorme. Tocar nele não faz nada, ele continua dormindo.
- A corujinha é a exceção: à noite ela fica acordada e voando.
- A canção de ninar vai abaixando sozinha e para depois de uns 15 minutos.

## Atalhos

- Setas: troca o bichinho
- N: liga/desliga a noite
- Espaço: o bichinho fala (só quando acordado)
