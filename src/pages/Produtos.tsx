import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useNFEStorage } from '@/hooks/useNFEStorage';

const ITEMS_PER_PAGE = 50;

const Produtos = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const { savedNFEs, loading, error } = useNFEStorage();

  console.log('Produtos component render:', { savedNFEs, loading, error });

  // Extrair todos os produtos das NFEs
  const allProducts = React.useMemo(() => {
    console.log('Calculating allProducts from:', savedNFEs);
    if (!savedNFEs || savedNFEs.length === 0) {
      console.log('No NFEs found');
      return [];
    }
    
    return savedNFEs.reduce((acc: any[], nfe) => {
      if (!nfe.produtos || !Array.isArray(nfe.produtos)) {
        console.log('NFE without produtos:', nfe);
        return acc;
      }
      
      const nfeProdutos = nfe.produtos.map(produto => ({
        ...produto,
        nfeId: nfe.id,
        fornecedor: nfe.fornecedor,
        dataEmissao: nfe.data,
        impostoEntrada: nfe.impostoEntrada
      }));
      return [...acc, ...nfeProdutos];
    }, []);
  }, [savedNFEs]);

  console.log('allProducts calculated:', allProducts);

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
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar produtos: {error}</p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
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
            <div className="text-2xl font-bold">{savedNFEs?.length || 0}</div>
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