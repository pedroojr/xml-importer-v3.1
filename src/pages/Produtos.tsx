import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight, AlertCircle, History as HistoryIcon, BadgeCheck } from "lucide-react";
import { mapApiProductsToComponents } from '@/utils/productMapper';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ITEMS_PER_PAGE = 50;

interface DebugInfo {
  nfesCount: number;
  firstNfeId?: string;
  firstNfeProdutos?: number;
  apiStatus: string;
  error?: string;
}

const Produtos = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [nfes, setNfes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<DebugInfo>({
    nfesCount: 0,
    apiStatus: 'Carregando...'
  });

  // Carregar NFEs diretamente da API
  React.useEffect(() => {
    const loadNFEs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 Carregando NFEs da API...');
        const response = await fetch('/api/nfes');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ NFEs carregadas:', data.length);
        console.log('📊 Primeira NFE:', data[0]);
        
        setNfes(data);
        
        // Debug info
        setDebugInfo({
          nfesCount: data.length,
          firstNfeId: data[0]?.id,
          firstNfeProdutos: data[0]?.produtos?.length || 0,
          apiStatus: 'OK'
        });
        
      } catch (err) {
        console.error('❌ Erro ao carregar NFEs:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        setDebugInfo({
          nfesCount: 0,
          error: errorMessage,
          apiStatus: 'ERRO'
        });
      } finally {
        setLoading(false);
      }
    };

    loadNFEs();
  }, []);

  // Extrair todos os produtos das NFEs e mapear para o formato esperado
  const allProducts = React.useMemo(() => {
    console.log('🔄 Processando produtos das NFEs...');
    
    if (!nfes || nfes.length === 0) {
      console.log('⚠️ Nenhuma NFE encontrada');
      return [];
    }
    
    const products = [];
    
    nfes.forEach((nfe, index) => {
      console.log(`📄 NFE ${index + 1}:`, nfe.id, 'produtos:', nfe.produtos?.length);
      
      if (nfe.produtos && Array.isArray(nfe.produtos)) {
        // Mapear produtos da API para o formato esperado pelos componentes
        console.log('🔍 Primeiro produto antes do mapeamento:', nfe.produtos[0]);
        
        const mappedProducts = mapApiProductsToComponents(nfe.produtos);
        console.log('🔍 Primeiro produto após mapeamento:', mappedProducts[0]);
        
        // TESTE DIRETO DO MAPEAMENTO
        console.log('🧪 TESTE DO MAPEAMENTO:');
        console.log('  - codigo -> code:', nfe.produtos[0]?.codigo, '->', mappedProducts[0]?.code);
        console.log('  - descricao -> name:', nfe.produtos[0]?.descricao, '->', mappedProducts[0]?.name);
        console.log('  - quantidade -> quantity:', nfe.produtos[0]?.quantidade, '->', mappedProducts[0]?.quantity);
        console.log('  - valorTotal -> totalPrice:', nfe.produtos[0]?.valorTotal, '->', mappedProducts[0]?.totalPrice);
        
        const nfeProdutos = mappedProducts.map(produto => ({
          ...produto,
          nfeId: nfe.id,
          fornecedor: nfe.fornecedor,
          dataEmissao: nfe.data,
          impostoEntrada: nfe.impostoEntrada
        }));
        
        products.push(...nfeProdutos);
        console.log(`✅ NFE ${nfe.id}: ${nfeProdutos.length} produtos mapeados e adicionados`);
      } else {
        console.log(`❌ NFE ${nfe.id}: sem produtos ou produtos inválidos`);
      }
    });
    
    console.log('🎯 Total de produtos processados:', products.length);
    if (products.length > 0) {
      console.log('🔍 Exemplo de produto processado:', products[0]);
      console.log('🔍 Campos mapeados do primeiro produto:');
      console.log('  - code:', products[0].code);
      console.log('  - name:', products[0].name);
      console.log('  - quantity:', products[0].quantity);
      console.log('  - totalPrice:', products[0].totalPrice);
    }
    return products;
  }, [nfes]);

  // Filtrar produtos baseado na busca
  const filteredProducts = React.useMemo(() => {
    if (!searchTerm) return allProducts;
    
    return allProducts.filter(product => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (product.codigo?.toString().toLowerCase().includes(searchLower) ||
        product.descricao?.toLowerCase().includes(searchLower) ||
        product.ean?.toString().includes(searchLower) ||
        product.reference?.toLowerCase().includes(searchLower) ||
        product.fornecedor?.toLowerCase().includes(searchLower) ||
        product.descricao_complementar?.toLowerCase().includes(searchLower))
      );
    });
  }, [allProducts, searchTerm]);

  // DEBUG: Verificar campos dos produtos
  React.useEffect(() => {
    if (allProducts.length > 0) {
      console.log('🔍 DEBUG: Campos do primeiro produto:');
      const firstProduct = allProducts[0];
      console.log('  - codigo:', firstProduct.codigo);
      console.log('  - descricao:', firstProduct.descricao);
      console.log('  - quantidade:', firstProduct.quantidade);
      console.log('  - valorTotal:', firstProduct.valorTotal);
      console.log('  - code (alias):', firstProduct.code);
      console.log('  - name (alias):', firstProduct.name);
      console.log('  - quantity (alias):', firstProduct.quantity);
      console.log('  - totalPrice (alias):', firstProduct.totalPrice);
    }
  }, [allProducts]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Funções de manipulação
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Drawer de histórico por código
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyCodigo, setHistoryCodigo] = React.useState<string | null>(null);
  const [historyItems, setHistoryItems] = React.useState<any[]>([]);
  const openHistory = async (codigo: string) => {
    try {
      setHistoryOpen(true);
      setHistoryCodigo(codigo);
      const resp = await fetch(`/api/precos/${encodeURIComponent(codigo)}`);
      if (resp.ok) {
        setHistoryItems(await resp.json());
      } else {
        setHistoryItems([]);
      }
    } catch {
      setHistoryItems([]);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  // Estatísticas dos produtos
  const totalQuantidade = filteredProducts.reduce((acc, prod) => acc + (prod.quantidade || 0), 0);
  const totalUnidades = filteredProducts.length;
  const valorTotal = filteredProducts.reduce((acc, prod) => acc + (prod.valorTotal || 0), 0);

  // Renderizar números de página
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar produtos</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full">
              Tentar novamente
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
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
        <h1 className="text-2xl font-bold text-gray-900">Produtos Importados</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Debug Info (apenas em DEV) */}
      {import.meta.env.DEV && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-800 mb-2">🔍 Informações de Debug</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>NFEs carregadas: {nfes.length}</p>
              <p>Produtos extraídos: {allProducts.length}</p>
              <p>Produtos filtrados: {filteredProducts.length}</p>
              <p>Status da API: {debugInfo.apiStatus}</p>
              {debugInfo.firstNfeId && (
                <p>Primeira NFE: {debugInfo.firstNfeId} ({debugInfo.firstNfeProdutos} produtos)</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnidades}</div>
            <p className="text-xs text-muted-foreground">Produtos únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantidade Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantidade}</div>
            <p className="text-xs text-muted-foreground">Unidades em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {valorTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Valor dos produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NFEs Importadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nfes.length}</div>
            <p className="text-xs text-muted-foreground">Notas fiscais</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos por código, descrição, EAN, fornecedor..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum produto encontrado</p>
              <p className="text-sm text-gray-400 mt-2">
                NFEs: {nfes.length} | 
                Produtos extraídos: {allProducts.length}
              </p>
              {allProducts.length === 0 && nfes.length > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ As NFEs não possuem produtos ou os produtos não foram extraídos corretamente
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedProducts.map((product, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{product.descricao}</h3>
                      <p className="text-sm text-gray-600">Código: {product.codigo}</p>
                      <p className="text-sm text-gray-600">Fornecedor: {product.fornecedor}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R$ {product.valorTotal?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-gray-600">Qtd: {product.quantidade}</p>
                    </div>
                  </div>
                  {/* Preços aprovados */}
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                    <div className="rounded bg-slate-50 px-2 py-1 border">
                      <span className="text-slate-600">Custo Líquido:</span>{' '}
                      <span className="font-medium">{product.custoLiquido ? `R$ ${Number(product.custoLiquido).toFixed(2)}` : '-'}</span>
                    </div>
                    <div className="rounded bg-slate-50 px-2 py-1 border">
                      <span className="text-slate-600">Preço Xap.:</span>{' '}
                      <span className="font-medium">{product.precoXapuri ? `R$ ${Number(product.precoXapuri).toFixed(2)}` : '-'}</span>
                    </div>
                    <div className="rounded bg-slate-50 px-2 py-1 border">
                      <span className="text-slate-600">Preço Epita.:</span>{' '}
                      <span className="font-medium">{product.precoEpita ? `R$ ${Number(product.precoEpita).toFixed(2)}` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {(product.precoXapuri && product.precoEpita) ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                          <BadgeCheck className="h-4 w-4" /> Aprovado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          Em edição
                        </span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openHistory(product.codigo)}>
                        <HistoryIcon className="h-4 w-4 mr-1" /> Histórico
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {renderPageNumbers()}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground ml-4">
            Página {currentPage} de {totalPages}
          </span>
        </div>
      )}
      {/* Drawer/Modal histórico */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de preços — Código {historyCodigo}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {historyItems.length === 0 && (
              <p className="text-sm text-gray-600">Sem histórico encontrado.</p>
            )}
            {historyItems.map((h, i) => (
              <div key={i} className="border rounded p-2 text-sm grid grid-cols-1 md:grid-cols-5 gap-2">
                <div><span className="text-gray-500">Data:</span> {new Date(h.createdAt || h.dataRegistro).toLocaleString()}</div>
                <div><span className="text-gray-500">Custo unit.:</span> R$ {(h.costUnit || 0).toFixed(2)}</div>
                <div><span className="text-gray-500">Custo líquido:</span> R$ {(h.costNet || 0).toFixed(2)}</div>
                <div><span className="text-gray-500">Xapuri:</span> R$ {(h.priceXapuri || 0).toFixed(2)}</div>
                <div><span className="text-gray-500">Epitac.:</span> R$ {(h.priceEpita || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos; 