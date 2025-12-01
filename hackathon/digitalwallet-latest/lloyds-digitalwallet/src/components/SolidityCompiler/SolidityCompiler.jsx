import { useState, useMemo } from "react";

import { useWebSolc } from "@web-solc/react";

export default function SolidityCompiler({ editorContent , fileName}) {
  const compiler = useWebSolc({ version: "^0.8.25" });
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | compiling | success | error
  console.log(fileName);
  const canCompile = Boolean(editorContent && editorContent.trim().length > 0 && !compiler.loading && !compiler.error);

  const compile = async () => {
    if (!canCompile) return;
    setStatus("compiling");
    setOutput("");
    try {
      const result = await compiler.compile({
        language: "Solidity",
        sources: {
          [`${fileName}.sol`]: {
            content: editorContent,
          },
        },
        settings: {
          outputSelection: {
            "*": {
              "*": ["*"],
            },
          },
        },
      });
      const formatted = JSON.stringify(result, null, 2);
      setOutput(formatted);
      setStatus("success");
      console.log("Compilation result:", result); 
      if (result.errors) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch (err) {
      // Try to format error as JSON if possible, otherwise fall back to string
      let formatted;
      try {
        if (typeof err === 'string') {
          const t = err.trim();
          if (t.startsWith('{') || t.startsWith('[')) {
            formatted = JSON.stringify(JSON.parse(t), null, 2);
          } else {
            formatted = err;
          }
        } else if (err && typeof err === 'object') {
          formatted = JSON.stringify(err, null, 2);
        } else {
          formatted = String(err);
        }
      } catch {
        formatted = String(err);
      }
      setOutput(formatted);
      setStatus("error");
    }
  };

  

  const statusBadge = useMemo(() => {
    switch (status) {
      case "compiling":
        return <span className="text-sm font-medium text-amber-600">Compiling…</span>;
      case "success":
        return <span className="text-sm font-medium text-green-600">Compilation Success</span>;
      case "error":
        return <span className="text-sm font-medium text-red-600">Compilation Error</span>;
      default:
        return <span className="text-sm font-medium text-gray-600">Idle</span>;
    }
  }, [status]);

  if (compiler.loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <div className="text-sm text-gray-600">Loading Solidity compiler...</div>
      </div>
    );
  }

  if (compiler.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <div className="text-red-700 font-medium">Compiler error</div>
        <div className="text-sm text-red-600">{compiler.error.message}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 ">
      <div className="items-center justify-between mb-3">
        <div className="items-center gap-3">
          <h3 className="text-lg text-center font-semibold text-gray-800">Solidity Compiler</h3>
        </div>
      </div>
      <div className="flex justify-between mb-3">
           <button
            onClick={compile}
            disabled={!canCompile || status === 'compiling'}
            className={`px-3 py-1 rounded-md text-white font-medium ${(canCompile || status === 'compiling') ? 'bg-[#0a4226] hover:bg-[#083620]' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            Compile
          </button>
          <div className="text-center font-bold" >{statusBadge}</div>
        </div>
      
      {/* <div className="text-sm text-gray-600 mb-3">Compile the current editor content and inspect the output below.</div> */}

      <div className="max-h-100 overflow-auto rounded p-2 text-xs font-mono">
        {output ? (
          status === 'error' ? (
            <pre className="whitespace-pre-wrap break-words bg-red-50 text-red-800 p-3 rounded border border-red-200 font-mono text-sm text-left">{output}</pre>
          ) : (
            <pre className="whitespace-pre-wrap break-words bg-gray-100 text-gray-800 p-3 rounded font-mono text-sm text-left">{output}</pre>
          )
        ) : (
          <div className="text-gray-500">No output yet. Click Compile to produce compiler output.</div>
        )}
      </div>
    </div>
  );
}

// Example showing preloaded compiler (kept for reference)
export function ExampleWithPreloadedCompiler() {
  // Imagine this is fetched from somewhere
  const soljson = "..."; // Would be actual soljson content

  const compiler = useWebSolc({ soljson });

  if (compiler.loading) return <>Loading preloaded compiler...</>;
  if (compiler.error) return <>Error: {compiler.error.message}</>;

  // Use compiler.compile as before
  return <div>Preloaded compiler ready!</div>;
}

