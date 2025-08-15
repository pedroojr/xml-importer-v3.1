import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, FileText } from "lucide-react";
import SavedNFEList from "@/components/SavedNFEList";

interface NFEApiItem {
  id: string;
  numero: string;
  fornecedor: string;
  data: string;
  produtos?: unknown[];
}

const Notas = () => {
  const navigate = useNavigate();
  const [nfes, setNfes] = React.useState<NFEApiItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadNFEs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/nfes');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setNfes(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao carregar notas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNFEs();
  }, [loadNFEs]);

  const formattedNFEs = React.useMemo(
    () => (nfes || []).map((nfe) => ({
      id: nfe.id,
      numero: nfe.numero,
      fornecedor: nfe.fornecedor,
      dataEmissao: nfe.data,
      quantidadeItens: Array.isArray(nfe.produtos) ? nfe.produtos.length : 0,
    })),
    [nfes]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando notas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar notas</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={loadNFEs} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadNFEs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {formattedNFEs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-600">Nenhuma nota encontrada.</p>
            </div>
          ) : (
            <SavedNFEList
              nfes={formattedNFEs}
              onNFESelect={(nfeId) => navigate(`/nfe/${nfeId}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notas;


