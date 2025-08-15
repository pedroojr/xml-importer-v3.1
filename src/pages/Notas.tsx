import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { useNFEStorage } from '@/hooks/useNFEStorage';
import SavedNFEList from '@/components/SavedNFEList';

const Notas = () => {
  const navigate = useNavigate();
  const { savedNFEs } = useNFEStorage();

  const formattedNFEs = savedNFEs.map((nfe) => ({
    id: nfe.id,
    numero: nfe.numero,
    fornecedor: nfe.fornecedor,
    dataEmissao: nfe.data,
    quantidadeItens: Array.isArray(nfe.produtos) ? nfe.produtos.length : 0,
  }));

  const handleNFESelect = (nfeId: string) => {
    navigate(`/nfe/${nfeId}`);
  };

  return (
    <div className="w-full p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notas</h1>
      </div>

      <Card className="bg-white">
        <CardContent className="p-4">
          <SavedNFEList nfes={formattedNFEs} onNFESelect={handleNFESelect} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Notas;


