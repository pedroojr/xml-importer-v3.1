import React, { useState, useEffect } from 'react';
import { Product } from '../../types/nfe';
import { calculateSalePrice, roundPrice, RoundingType, calcularFreteProporcional } from './productCalculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ProductAnalysis } from './insights/ProductAnalysis';
import { ProductToolbar } from './ProductToolbar';
import { ProductTable } from './ProductTable';
import { getDefaultColumns, compactColumns, Column } from './types/column';
import { ProductAnalysisTabs } from './ProductAnalysisTabs';
import { ExportOptions } from './ExportOptions';
import { ProductImageModal } from './ProductImageModal';
import { useImpostoEntrada } from '../../hooks/useImpostoEntrada';
import { nfeAPI } from '@/services/api';
import axios from 'axios';

interface ProductPreviewProps {
  products: Product[];
  onProductUpdate?: (index: number, product: Product) => void;
  editable?: boolean;
  onConfigurationUpdate?: (xapuriMarkup: number, epitaMarkup: number, roundingType: string) => void;
  onNewFile?: (products: Product[]) => void;
  hiddenItems?: Set<number>;
  onToggleVisibility?: (index: number) => void;
  xapuriMarkup: number;
  epitaMarkup: number;
  roundingType: RoundingType;
  onXapuriMarkupChange: (value: number) => void;
  onEpitaMarkupChange: (value: number) => void;
  onRoundingTypeChange: (value: RoundingType) => void;
  invoiceNumber?: string; // usado para escopo das configurações por nota
  nfeId?: string; // id da NFE para persistência no servidor
}

const ProductPreview: React.FC<ProductPreviewProps> = ({ 
  products, 
  onProductUpdate, 
  editable = false,
  onConfigurationUpdate,
  onNewFile,
  hiddenItems = new Set(),
  onToggleVisibility,
  xapuriMarkup,
  epitaMarkup,
  roundingType,
  onXapuriMarkupChange,
  onEpitaMarkupChange,
  onRoundingTypeChange,
  invoiceNumber,
  nfeId
}) => {
  // Escopo por nota: prioriza invoiceNumber, mas aceita qualquer identificador único que vier
  const scopeId = (nfeId || invoiceNumber) || undefined;
  const { impostoEntrada, setImpostoEntrada } = useImpostoEntrada(0, scopeId);

  const scopedKey = (key: string) => (scopeId ? `${scopeId}:${key}` : key);

  const [valorFrete, setValorFrete] = useState<number>(() => {
    const saved = localStorage.getItem(scopedKey('valorFrete'));
    return saved ? Number(saved) : 0;
  });
  const [locked, setLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem(scopedKey('locked'));
    return saved ? JSON.parse(saved) : false;
  });

  // Calculate suggested markups
  const totalBruto = products.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalLiquido = products.reduce((sum, p) => sum + p.netPrice, 0);
  
  // Markup sugerido para Xapuri (ajustando para custo líquido)
  const precoVendaXapuri = totalBruto * 2.2;
  const xapuriSuggestedMarkup = totalLiquido > 0 ? Math.round(((precoVendaXapuri / totalLiquido) - 1) * 100) : 120;
  
  // Markup sugerido para Epitaciolândia (já está em relação ao custo líquido)
  const epitaSuggestedMarkup = 130; // Equivalente a preço = custo líquido * 2.3

  const [localHiddenItems, setLocalHiddenItems] = useState<Set<number>>(hiddenItems);
  const [compactMode, setCompactMode] = useState(() => {
    const saved = localStorage.getItem(scopedKey('compactMode'));
    return saved ? JSON.parse(saved) : false;
  });
  
  const [selectedImageProduct, setSelectedImageProduct] = useState<Product | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [invoiceNumberState, setInvoiceNumberState] = useState<string | null>(null);
  const [brandNameState, setBrandNameState] = useState<string | null>(null);

  const columns = getDefaultColumns();
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(scopedKey('visibleColumns'));
    if (saved) {
      const parsedColumns = JSON.parse(saved) as string[];
      return new Set(parsedColumns);
    }
    return new Set(compactMode ? compactColumns : [...columns.map(col => col.id), 'tags']);
  });

  const [sortedColumns, setSortedColumns] = useState<Column[]>(() => {
    const savedColumnOrder = localStorage.getItem(scopedKey('columnOrder'));
    if (savedColumnOrder) {
      const orderMap = JSON.parse(savedColumnOrder) as Record<string, number>;
      return [...columns].sort((a, b) => (orderMap[a.id] || a.order || 0) - (orderMap[b.id] || b.order || 0));
    }
    return [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  useEffect(() => {
    setLocalHiddenItems(hiddenItems);
  }, [hiddenItems]);

  useEffect(() => {
    // Persistir apenas estados locais deste componente para não sobrescrever
    // valores escopados de outras notas vindos do componente pai
    localStorage.setItem(scopedKey('compactMode'), JSON.stringify(compactMode));
    localStorage.setItem(scopedKey('valorFrete'), valorFrete.toString());
    localStorage.setItem(scopedKey('locked'), JSON.stringify(locked));
  }, [compactMode, valorFrete, locked, scopeId]);

  // Persistir no servidor quando alterar e não estiver trancado
  useEffect(() => {
    if (!nfeId || locked) return;
    const timeout = setTimeout(async () => {
      try {
        await nfeAPI.update(nfeId, {
          impostoEntrada,
          xapuriMarkup,
          epitaMarkup,
          roundingType,
          valorFrete,
          locked: false,
        });
      } catch (err) {
        console.error('Erro ao persistir NFE:', err);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [nfeId, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete, locked]);

  // Quando o usuário tranca, persistir imediatamente como aprovado
  useEffect(() => {
    if (!nfeId) return;
    const persist = async () => {
      try {
        await nfeAPI.update(nfeId, {
          impostoEntrada,
          xapuriMarkup,
          epitaMarkup,
          roundingType,
          valorFrete,
          locked,
        });
      } catch (err) {
        console.error('Erro ao salvar estado de lock:', err);
      }
    };
    persist();
  }, [locked]);

  const handleMarkupChange = (xapuri: number, epita: number, rounding: RoundingType) => {
    onXapuriMarkupChange(xapuri);
    onEpitaMarkupChange(epita);
    onRoundingTypeChange(rounding);
    onConfigurationUpdate?.(xapuri, epita, rounding);
  };

  const handleImageSearch = async (index: number, product: Product) => {
    const searchTerms = `${product.ean} ${product.code} ${product.name}`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchTerms)}&tbm=isch`, '_blank');
  };

  const toggleColumn = (columnId: string) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (newVisibleColumns.has(columnId)) {
      newVisibleColumns.delete(columnId);
    } else {
      newVisibleColumns.add(columnId);
    }
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem(scopedKey('visibleColumns'), JSON.stringify(Array.from(newVisibleColumns)));
  };

  const toggleCompactMode = () => {
    const newMode = !compactMode;
    setCompactMode(newMode);
    const newColumns = new Set(newMode ? compactColumns : columns.map(col => col.id));
    setVisibleColumns(newColumns);
    localStorage.setItem(scopedKey('visibleColumns'), JSON.stringify(Array.from(newColumns)));
    localStorage.setItem(scopedKey('compactMode'), JSON.stringify(newMode));
  };

  const handleToggleVisibility = (index: number) => {
    if (onToggleVisibility) {
      onToggleVisibility(index);
    } else {
      const newHiddenItems = new Set(localHiddenItems);
      if (newHiddenItems.has(index)) {
        newHiddenItems.delete(index);
        toast.success('Item exibido novamente');
      } else {
        newHiddenItems.add(index);
        toast.success('Item ocultado');
      }
      setLocalHiddenItems(newHiddenItems);
    }
  };

  const handleNewFileRequest = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xml';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          onNewFile?.(products);
          toast.success('Nova nota carregada com sucesso');
        } catch (error) {
          toast.error('Erro ao carregar nova nota');
        }
      }
    };
    fileInput.click();
  };

  const effectiveHiddenItems = onToggleVisibility ? hiddenItems : localHiddenItems;

  // Calcular frete proporcional para cada item
  const fretesProporcionais = calcularFreteProporcional(products, valorFrete, impostoEntrada);
  // Adiciona o campo nfeId para cada produto (usando invoiceNumber ou um valor fixo se não houver)
  const nfeIdForProducts = scopeId || 'nfe-id-unico';
  // Atualizar produtos com frete proporcional
  const productsWithFrete = products.map((p, idx) => ({
    ...p,
    nfeId: nfeIdForProducts,
    freteProporcional: fretesProporcionais[idx] || 0,
    // Custo final unitário: custo líquido unitário + frete proporcional unitário
    netPrice: (p.netPrice || 0) + (fretesProporcionais[idx] || 0)
  }));

  // SSE: assinar atualizações em tempo real desta NFE
  useEffect(() => {
    if (!nfeId) return;
    const source = new EventSource(`${location.origin}/api/stream/nfes/${nfeId}`);
    source.addEventListener('nfe_updated', async (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        if (payload?.id !== nfeId) return;
        // Recarrega dados da NFE do servidor
        const updated = await nfeAPI.getById(nfeId);
        // Atualiza controles com o que veio do servidor, preservando lock local
        onXapuriMarkupChange(updated.xapuriMarkup ?? xapuriMarkup);
        onEpitaMarkupChange(updated.epitaMarkup ?? epitaMarkup);
        onRoundingTypeChange((updated.roundingType as RoundingType) || roundingType);
        setImpostoEntrada(updated.impostoEntrada ?? impostoEntrada);
        const k = (key: string) => (scopeId ? `${scopeId}:${key}` : key);
        if (typeof updated.valorFrete === 'number') {
          localStorage.setItem(k('valorFrete'), String(updated.valorFrete));
          setValorFrete(updated.valorFrete);
        }
      } catch (e) {
        console.error('Erro ao processar SSE nfe_updated:', e);
      }
    });
    return () => source.close();
  }, [nfeId]);

  return (
    <div className="w-full max-w-full flex-1">
      <div className="rounded-lg border bg-white shadow-sm">
        <Tabs defaultValue="unified" className="w-full">
          <div className="sticky top-0 z-10 bg-white border-b">
            <TabsList className="w-full justify-start rounded-none border-0">
              <TabsTrigger value="unified">Visão Unificada</TabsTrigger>
              <TabsTrigger value="insights">Insights e Análises</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="unified" className="p-0 w-full">
            <ProductToolbar
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              impostoEntrada={impostoEntrada}
              roundingType={roundingType}
              onXapuriMarkupChange={(value) => handleMarkupChange(value, epitaMarkup, roundingType)}
              onEpitaMarkupChange={(value) => handleMarkupChange(xapuriMarkup, value, roundingType)}
              onImpostoEntradaChange={setImpostoEntrada}
              onRoundingChange={(value) => handleMarkupChange(xapuriMarkup, epitaMarkup, value)}
              compactMode={compactMode}
              toggleCompactMode={toggleCompactMode}
              columns={sortedColumns}
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumn}
              onNewFileRequest={handleNewFileRequest}
              xapuriSuggestedMarkup={xapuriSuggestedMarkup}
              epitaSuggestedMarkup={epitaSuggestedMarkup}
              totalItems={products.length}
              filteredItems={products.length - effectiveHiddenItems.size}
              valorFrete={valorFrete}
              onValorFreteChange={setValorFrete}
              locked={locked}
              onToggleLock={() => setLocked(prev => !prev)}
            />

            <ProductTable
              products={productsWithFrete}
              visibleColumns={visibleColumns}
              columns={sortedColumns}
              hiddenItems={effectiveHiddenItems}
              handleToggleVisibility={handleToggleVisibility}
              handleImageSearch={handleImageSearch}
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              impostoEntrada={impostoEntrada}
              roundingType={roundingType}
              onXapuriMarkupChange={onXapuriMarkupChange}
              onEpitaMarkupChange={onEpitaMarkupChange}
              onImpostoEntradaChange={setImpostoEntrada}
              onRoundingTypeChange={onRoundingTypeChange}
            />
          </TabsContent>

          <TabsContent value="insights" className="p-4">
            <div className="space-y-8 w-full">
              <ProductAnalysisTabs 
                products={products} 
                xapuriMarkup={xapuriMarkup} 
                epitaMarkup={epitaMarkup} 
              />
              <ProductAnalysis products={products} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {isImageModalOpen && selectedImageProduct && (
        <ProductImageModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          imageUrl={selectedImageProduct?.imageUrl || ''}
          productName={selectedImageProduct?.name || ''}
          productEan={selectedImageProduct?.ean || ''}
          onSearchNew={() => {
            if (selectedImageProduct) {
              handleImageSearch(products.indexOf(selectedImageProduct), selectedImageProduct);
            }
          }}
          onDownload={() => {
            if (selectedImageProduct) {
              // Implementar lógica de download aqui
            }
          }}
        />
      )}
      
      {isExportModalOpen && (
        <ExportOptions
          products={products}
          invoiceNumber={invoiceNumberState || ''}
          brandName={brandNameState || ''}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductPreview;
