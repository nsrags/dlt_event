import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

export const SolidityEditorComponent = ({ value, onChange }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEditorWillMount = (monaco) => {
    // Register Solidity language
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
    monaco.editor.defineTheme("solidityTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "C586C0", fontStyle: "bold" },
        { token: "number", foreground: "B5CEA8" },
        { token: "string", foreground: "CE9178" },
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "identifier", foreground: "9CDCFE" },
      ],
      colors: {
        "editor.background": "#1E1E1E",
        "editorLineNumber.foreground": "#858585",
        "editorCursor.foreground": "#FFFFFF",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41"
      }
    });
  };

  return (
    <div className="relative">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors flex items-center gap-2"
        title="Copy code"
      >
        {copied ? (
          <>
            <CheckIcon className="w-4 h-4" />
            <span className="text-xs">Copied!</span>
          </>
        ) : (
          <>
            <ClipboardDocumentIcon className="w-4 h-4" />
            <span className="text-xs">Copy</span>
          </>
        )}
      </button>

      <Editor
        height="50vh"
        defaultLanguage="solidity"
        value={value}
        onChange={onChange}
        theme="solidityTheme"
        beforeMount={handleEditorWillMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
};
