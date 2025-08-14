import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

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
        const response = await fetch('https://xml.lojasrealce.shop/api/nfes');
        
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

  // Extrair todos os produtos das NFEs
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
        const nfeProdutos = nfe.produtos.map(produto => ({
          ...produto,
          nfeId: nfe.id,
          fornecedor: nfe.fornecedor,
          dataEmissao: nfe.data,
          impostoEntrada: nfe.impostoEntrada
        }));
        
        products.push(...nfeProdutos);
        console.log(`✅ NFE ${nfe.id}: ${nfeProdutos.length} produtos adicionados`);
      } else {
        console.log(`❌ NFE ${nfe.id}: sem produtos ou produtos inválidos`);
      }
    });
    
    console.log('🎯 Total de produtos processados:', products.length);
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
        product.referencia?.toLowerCase().includes(searchLower) ||
        product.fornecedor?.toLowerCase().includes(searchLower) ||
        product.descricao_complementar?.toLowerCase().includes(searchLower))
      );
    });
  }, [allProducts, searchTerm]);

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

      {/* Debug Info */}
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
    </div>
  );
};

export default Produtos; 