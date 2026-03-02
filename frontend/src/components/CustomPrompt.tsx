import React, { useState } from 'react';
import '../styles/CustomPrompt.css';

interface CustomPromptProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const CustomPrompt: React.FC<CustomPromptProps> = ({
  isOpen,
  title,
  message,
  placeholder = '',
  onConfirm,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleConfirm = () => {
    onConfirm(inputValue);
    setInputValue('');
  };

  const handleCancel = () => {
    onCancel();
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="custom-prompt-overlay">
      <div className="custom-prompt-modal">
        <div className="custom-prompt-header">
          <h3>{title}</h3>
        </div>
        <div className="custom-prompt-body">
          <p>{message}</p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            autoFocus
            className="custom-prompt-input"
          />
        </div>
        <div className="custom-prompt-actions">
          <button 
            type="button" 
            onClick={handleCancel}
            className="btn-secondary"
          >
            Batal
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            className="btn-primary"
            disabled={!inputValue.trim()}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPrompt;