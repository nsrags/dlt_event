import * as monaco from "monaco-editor";

// Register Solidity language (if not already)
monaco.languages.register({ id: "solidity" });

monaco.languages.setMonarchTokensProvider("solidity", {
  keywords: [
    "pragma", "contract", "library", "interface", "function", "modifier",
    "event", "struct", "enum", "mapping", "address", "bool", "string",
    "bytes", "uint", "int", "public", "private", "internal", "external",
    "view", "pure", "payable", "returns", "import", "using", "new",
    "delete", "if", "else", "for", "while", "do", "break", "continue",
    "return", "throw", "emit", "assembly"
  ],
  tokenizer: {
    root: [
      [/[a-zA-Z_$][\w$]*/, {
        cases: {
          "@keywords": "keyword",
          "@default": "identifier"
        }
      }],
      [/[0-9]+/, "number"],
      [/".*?"/, "string"],
      [/'.*?'/, "string"],
      [/\/\/.*$/, "comment"],
      [/\/\*.*\*\//, "comment"],
    ]
  }
});

// Define custom theme
const solidityTheme = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "C586C0", fontStyle: "bold" }, // purple keywords
    { token: "number", foreground: "B5CEA8" }, // green numbers
    { token: "string", foreground: "CE9178" }, // orange strings
    { token: "comment", foreground: "6A9955", fontStyle: "italic" }, // green italic comments
    { token: "identifier", foreground: "9CDCFE" }, // blue identifiers
  ],
  colors: {
    "editor.background": "#1E1E1E",
    "editorLineNumber.foreground": "#858585",
    "editorCursor.foreground": "#FFFFFF",
    "editor.selectionBackground": "#264F78",
    "editor.inactiveSelectionBackground": "#3A3D41"
  }
};

monaco.editor.defineTheme("solidityTheme", solidityTheme);

export { solidityTheme };