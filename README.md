
# 🧩 Divisor de Certificados — PDF + XLSX

Uma aplicação web elegante e responsiva (HTML, CSS e JavaScript puros) para **separar certificados em PDF** e **nomeá-los automaticamente** a partir de uma planilha XLSX.

## ✨ Visão Geral

Este projeto foi criado para facilitar a tarefa de dividir um único PDF com vários certificados (ex.: turmas de alunos) em **arquivos individuais**, com nomes obtidos automaticamente de uma **planilha Excel**.

Tudo acontece **no navegador**, sem upload para servidores — os dados permanecem locais e privados.

---

## 🚀 Funcionalidades

- 📂 Upload simultâneo de **PDF** e **planilha XLSX**
- 🔢 Configuração de **quantas páginas por certificado**
- 📑 Leitura automática de **abas e colunas da planilha**
- 🧭 Interface para escolher qual **coluna contém os nomes**
- 🧠 Mapeamento automático dos nomes para cada certificado
- 📦 Geração de um **ZIP com todos os PDFs individuais**
- 💅 Interface moderna, clara e responsiva (modo claro)
- 🔐 Processamento 100% no navegador (sem backend)

---

## 🧰 Tecnologias utilizadas

| Tecnologia | Função |
|-------------|--------|
| **HTML5** | Estrutura da aplicação |
| **CSS3 (Flex/Grid)** | Estilo e responsividade |
| **JavaScript (ES6+)** | Lógica principal |
| **[pdf-lib](https://github.com/Hopding/pdf-lib)** | Leitura e divisão de PDFs |
| **[SheetJS/xlsx](https://sheetjs.com/)** | Leitura de planilhas Excel |
| **[JSZip](https://stuk.github.io/jszip/)** | Compactação dos PDFs gerados |
| **[FileSaver.js](https://github.com/eligrey/FileSaver.js)** | Download do ZIP no navegador |

---

## 🖥️ Como usar

1. **Abra o arquivo `index.html`** no navegador (não precisa de servidor).
2. **Envie o PDF** com todos os certificados.
3. **Envie a planilha XLSX** com os nomes (uma coluna por aluno).
4. Escolha:
   - a **aba** correta da planilha;
   - a **coluna** com os nomes;
   - e quantas **páginas por certificado**.
5. Confira o **mapeamento** dos certificados → nomes.
6. Clique em **“Separar e baixar ZIP”**.
7. 🎉 Pronto! Um arquivo `certificados-divididos.zip` será baixado.

---

## 📁 Estrutura do projeto

```
web-cert-splitter/
├── index.html    # Página principal
├── styles.css    # Estilos (tema claro, responsivo)
├── app.js        # Lógica da aplicação
└── README.md     # Este arquivo
```

---

## ⚙️ Requisitos

- Navegador moderno (Chrome, Edge, Firefox, Safari)
- Permitir execução de scripts locais
- Arquivo PDF bem formatado (mesmo número de páginas por certificado)

---

## 💡 Dicas

- Verifique se a planilha tem **mesmo número de nomes** que o total de certificados gerados.  
- Evite nomes com caracteres especiais — eles são automaticamente substituídos por “-”.
- Você pode testar localmente sem servidor; tudo roda client-side.

---

## 🧑‍💻 Autor

Desenvolvido com ❤️ por **Thiago Traue** — para simplificar o gerenciamento de certificados acadêmicos e corporativos.

---

## 🗂️ Dividir em pastas

Opcionalmente, você pode marcar **“Dividir em pastas”** e escolher uma **coluna** da planilha que contenha o **nome da pasta** para cada certificado (mapeado linha a linha). Nesse caso, o ZIP final terá subpastas e cada PDF será salvo na pasta correspondente.
