import React, { useState, useRef } from 'react';
import { CloudArrowUpIcon, DocumentTextIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { SolidityEditorComponent } from '../Editor/Editor';

export default function FileUpload({ onFileUpload, onEditorChange }) {
  const [editorContent, setEditorContent] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileRead = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setEditorContent(content);
      setFileName(file.name);
      setShowEditor(true);
      
      // Notify parent component about file upload
      if (onFileUpload) {
        onFileUpload({
          fileName: file.name,
          content: content
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleEditorChange = (value) => {
    setEditorContent(value || '');
    
    // Notify parent component about editor changes
    if (onEditorChange) {
      onEditorChange({
        fileName: fileName,
        content: value || ''
      });
    }
  };

  const handleUploadAnother = () => {
    setShowEditor(false);
    setEditorContent('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Notify parent to disable deploy button
    if (onFileUpload) {
      onFileUpload(null);
    }
  };

  const handleSaveAndDownload = () => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'contract.sol';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      {!showEditor && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-[#0a4226] bg-green-50'
              : 'border-gray-300 hover:border-[#0a4226] hover:bg-gray-50'
          }`}
        >
          <CloudArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Upload your Solidity contract
          </h3>
          <p className="text-gray-500 mb-6">
            Drag and drop your .sol file here, or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sol"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a4226] text-white rounded-lg hover:bg-[#083620] transition-colors cursor-pointer"
          >
            <DocumentTextIcon className="w-5 h-5" />
            Choose File
          </label>
        </div>
      )}

      {/* Editor Section with Upload Another Button */}
      {showEditor && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700">
              <DocumentTextIcon className="w-5 h-5 text-[#0a4226]" />
              <span className="font-medium">{fileName}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAndDownload}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0a4226] hover:bg-[#083620] text-white rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleUploadAnother}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                Upload Another File
              </button>
            </div>
          </div>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <SolidityEditorComponent
              value={editorContent}
              onChange={handleEditorChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}