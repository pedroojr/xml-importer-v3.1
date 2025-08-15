import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Building2, Calendar, Package2, Receipt, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { mapApiProductsToComponents } from '@/utils/productMapper';

interface Produto {
  id: number;
  nfeId: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  baseCalculoICMS: number;
  valorICMS: number;
  aliquotaICMS: number;
  baseCalculoIPI: number;
  valorIPI: number;
  aliquotaIPI: number;
  ean: string;
  reference: string;
  brand: string;
  imageUrl: string;
  descricao_complementar: string;
  custoExtra: number;
  freteProporcional: number;
}

interface NFE {
  id: string;
  data: string;
  numero: string;
  chaveNFE: string;
  fornecedor: string;
  valor: number;
  itens: number;
  impostoEntrada: number;
  xapuriMarkup: number;
  epitaMarkup: number;
  roundingType: string;
  valorFrete: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  produtos: Produto[];
}

const NFEView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nfe, setNfe] = React.useState<NFE | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Carregar NFE diretamente da API
  React.useEffect(() => {
    const loadNFE = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 Carregando NFE da API:', id);
        const response = await fetch(`https://xml.lojasrealce.shop/api/nfes/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ NFE carregada:', data);
        console.log('📦 Produtos da NFE:', data.produtos?.length || 0);
        
        // Mapear produtos da API para o formato esperado
        if (data.produtos && Array.isArray(data.produtos)) {
          data.produtos = mapApiProductsToComponents(data.produtos);
          console.log('🔄 Produtos mapeados para formato de componente');
        }
        
        setNfe(data);
        
      } catch (err) {
        console.error('❌ Erro ao carregar NFE:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadNFE();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando nota fiscal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar nota fiscal</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!nfe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Nota Fiscal não encontrada</h2>
        <p className="text-gray-500 mb-4">A nota fiscal que você está procurando não existe ou foi removida.</p>
        <Button onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o Dashboard
        </Button>
      </div>
    );
  }

  // Calcular estatísticas dos produtos
  const totalProdutos = nfe.produtos?.length || 0;
  const valorTotalProdutos = nfe.produtos?.reduce((acc, p) => acc + (p.valorTotal || 0), 0) || 0;
  const quantidadeTotal = nfe.produtos?.reduce((acc, p) => acc + (p.quantidade || 0), 0) || 0;
  const valorMedioPorItem = totalProdutos > 0 ? valorTotalProdutos / totalProdutos : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Nota Fiscal {nfe.numero}</h1>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          Imprimir / Exportar PDF
        </Button>
      </div>

      {/* Debug Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-800 mb-2">🔍 Informações de Debug</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>NFE ID: {nfe.id}</p>
            <p>Produtos carregados: {totalProdutos}</p>
            <p>Valor total produtos: R$ {(Number(valorTotalProdutos) || 0).toFixed(2)}</p>
            <p>Quantidade total: {quantidadeTotal}</p>
            <p>Status: {loading ? 'Carregando...' : error ? 'Erro' : 'OK'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Informações da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Número:</span>
              <span>{nfe.numero}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Fornecedor:</span>
              <span>{nfe.fornecedor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Data de Emissão:</span>
              <span>{formatDate(new Date(nfe.data))}</span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Valor Total:</span>
              <span>{formatCurrency(nfe.valor)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Chave NFE:</span>
              <span className="text-sm text-gray-600">{nfe.chaveNFE}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Resumo dos Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package2 className="w-4 h-4 text-gray-500" />
                  <span>Total de Itens:</span>
                </div>
                <span className="font-medium">{totalProdutos}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Quantidade Total:</span>
                <span className="font-medium">{quantidadeTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Valor Total Produtos:</span>
                <span className="font-medium">{formatCurrency(valorTotalProdutos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Valor Médio por Item:</span>
                <span className="font-medium">{formatCurrency(valorMedioPorItem)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Lista de Produtos ({totalProdutos})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalProdutos === 0 ? (
            <div className="text-center py-8">
              <Package2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum produto encontrado nesta NFE</p>
              <p className="text-sm text-gray-400 mt-2">
                Verifique se os produtos foram importados corretamente
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {nfe.produtos?.map((produto, index) => (
                <div
                  key={produto.id || index}
                  className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{produto.descricao || 'Descrição não disponível'}</h3>
                      <p className="text-sm text-gray-500">
                        Código: {produto.codigo || 'N/A'} • NCM: {produto.ncm || 'N/A'}
                      </p>
                      {produto.ean && (
                        <p className="text-sm text-gray-600">EAN: {produto.ean}</p>
                      )}
                      {produto.reference && (
                        <p className="text-sm text-gray-600">Referência: {produto.reference}</p>
                      )}
                      {produto.brand && (
                        <p className="text-sm text-gray-600">Marca: {produto.brand}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">{formatCurrency(Number(produto.valorTotal) || 0)}</p>
                      <p className="text-sm text-gray-500">
                        {(Number(produto.quantidade) || 0)} x {formatCurrency(Number(produto.valorUnitario) || 0)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Unidade: {produto.unidade || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NFEView; 