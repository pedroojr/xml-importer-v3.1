import React from 'react';

export interface NfeTab {
  id: string;
  title: string;
  locked: boolean;
}

interface TabsNfeProps {
  tabs: NfeTab[];
  activeId?: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

const TabsNfe: React.FC<TabsNfeProps> = ({ tabs, activeId, onActivate, onClose }) => {
  return (
    <div className="w-full border-b bg-white sticky top-0 z-20">
      <div className="flex gap-2 px-2 py-2 overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-3 py-1 rounded-md border text-sm cursor-pointer select-none ${activeId === tab.id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'}`}
            onClick={() => onActivate(tab.id)}
            title={tab.title}
          >
            <span className="truncate max-w-[220px]">{tab.title}</span>
            <button
              className={`ml-2 text-xs px-1 rounded ${tab.locked ? 'text-red-600 hover:bg-red-50' : 'text-gray-400'} ${tab.locked ? '' : 'cursor-not-allowed'}`}
              onClick={(e) => { e.stopPropagation(); if (tab.locked) onClose(tab.id); }}
              aria-disabled={!tab.locked}
              title={tab.locked ? 'Fechar aba' : 'Conclua para poder fechar'}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabsNfe;


