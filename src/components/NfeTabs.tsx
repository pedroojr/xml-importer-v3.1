import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export interface NfeTab {
  id: string;
  numero: string;
  fornecedor: string;
  locked?: boolean;
}

interface NfeTabsProps {
  tabs: NfeTab[];
  activeId?: string | null;
  onActivate: (id: string) => void;
  onRequestClose: (id: string) => void; // será chamado somente se locked=true; senão o componente bloqueia
}

export const NfeTabs: React.FC<NfeTabsProps> = ({ tabs, activeId, onActivate, onRequestClose }) => {
  const [pendingClose, setPendingClose] = React.useState<NfeTab | null>(null);

  return (
    <div className="w-full border-b bg-white sticky top-0 z-30">
      <div className="flex gap-2 px-3 py-2 overflow-x-auto">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer select-none ${activeId === t.id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
            onClick={() => onActivate(t.id)}
            title={t.fornecedor}
          >
            <span className="text-sm font-medium">NF {t.numero}</span>
            <span className="text-xs opacity-70">— {t.fornecedor}</span>
            <Button
              variant="outline"
              size="sm"
              className={`ml-2 h-6 px-2 text-xs ${t.locked ? 'border-red-300 text-red-600' : 'border-gray-200 text-gray-400'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (t.locked) {
                  onRequestClose(t.id);
                } else {
                  setPendingClose(t);
                }
              }}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={!!pendingClose} onOpenChange={(o) => !o && setPendingClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nota em edição</AlertDialogTitle>
            <AlertDialogDescription>
              Esta NFe ainda não foi concluída. Para fechar a aba, conclua a nota ou confirme o fechamento sem concluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingClose(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingClose) { onRequestClose(pendingClose.id); setPendingClose(null); } }}>Fechar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NfeTabs;


