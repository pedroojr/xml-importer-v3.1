import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Info, History, Edit2, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { SefazIntegration } from "@/components/SefazIntegration";
import FileUploadPDF from "@/components/FileUploadPDF";
import ProductPreview from "@/components/product-preview/ProductPreview";
import { useNFEStorage } from "@/hooks/useNFEStorage";
import { Product, NFE } from "@/types/nfe";
import { RoundingType } from "@/components/product-preview/productCalculations";
import { parseNFeXML } from "@/utils/nfeParser";
import NfeTabs, { NfeTab } from "@/components/NfeTabs";
import { nfeAPI } from "@/services/api";
import { mapApiProductsToComponents } from "@/utils/productMapper";

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentNFeId, setCurrentNFeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTab, setCurrentTab] = useState("upload");
  const [xmlContentForDataSystem, setXmlContentForDataSystem] = useState<string | null>(null);
  const [pdfItems, setPdfItems] = useState<any[]>([]);
  const [hiddenItems, setHiddenItems] = useState<Set<number>>(new Set());
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const scopedKey = (key: string) => ((currentNFeId || invoiceNumber) ? `${(currentNFeId || invoiceNumber)}:${key}` : key);

  const [xapuriMarkup, setXapuriMarkup] = useState(() => {
    const saved = localStorage.getItem(scopedKey('xapuriMarkup'));
    return saved ? parseInt(saved) : 160;
  });
  const [epitaMarkup, setEpitaMarkup] = useState(() => {
    const saved = localStorage.getItem(scopedKey('epitaMarkup'));
    return saved ? parseInt(saved) : 130;
  });
  const [impostoEntrada, setImpostoEntrada] = useState(() => {
    const saved = localStorage.getItem(scopedKey('impostoEntrada'));
    return saved ? parseInt(saved) : 12;
  });
  const [roundingType, setRoundingType] = useState<RoundingType>(() => {
    const saved = localStorage.getItem(scopedKey('roundingType'));
    return (saved as RoundingType) || 'none';
  });
  const [brandName, setBrandName] = useState<string>("");
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  // Abas de NFe
  const [nfeTabs, setNfeTabs] = useState<NfeTab[]>(() => {
    try {
      const raw = localStorage.getItem('nfeTabs');
      return raw ? JSON.parse(raw) as NfeTab[] : [];
    } catch {
      return [];
    }
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => localStorage.getItem('nfeActiveTabId'));

  const { savedNFEs, saveNFE, removeNFE } = useNFEStorage();

  const extractNFeInfo = (xmlDoc: Document) => {
    const nfeNode = xmlDoc.querySelector('NFe');
    if (!nfeNode) return null;

    const ideNode = nfeNode.querySelector('ide');
    const emitNode = nfeNode.querySelector('emit');
    const destNode = nfeNode.querySelector('dest');

    if (!ideNode || !emitNode) return null;

    const numero = ideNode.querySelector('nNF')?.textContent || '';
    const dataEmissao = ideNode.querySelector('dhEmi')?.textContent || '';
    const chaveNFE = nfeNode.querySelector('infNFe')?.getAttribute('Id')?.replace('NFe', '') || '';
    
    const emitNome = emitNode.querySelector('xNome')?.textContent || '';
    const emitCNPJ = emitNode.querySelector('CNPJ')?.textContent || emitNode.querySelector('CPF')?.textContent || '';

    return {
      numero,
      dataEmissao,
      chaveNFE,
      emitNome,
      emitCNPJ
    };
  };

  const handleDeleteCurrentNFe = () => {
    if (currentNFeId) {
      removeNFE(currentNFeId);
      setProducts([]);
      setHiddenItems(new Set());
      setCurrentNFeId(null);
      setInvoiceNumber("");
      setBrandName("");
      setIsEditingBrand(false);
      setXmlContentForDataSystem(null);
      setCurrentTab("upload");
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
      
      const nfeInfo = extractNFeInfo(xmlDoc);
      if (!nfeInfo) {
        throw new Error('Arquivo XML inválido ou não é uma NF-e');
      }

      const extractedProducts = parseNFeXML(text);
      setProducts(extractedProducts);
      setHiddenItems(new Set());
      
      const nfeId = `nfe_${Date.now()}`;
      setCurrentNFeId(nfeId);
      setInvoiceNumber(nfeInfo.numero);
      setBrandName(nfeInfo.emitNome);
      setXmlContentForDataSystem(text);
      
      // Salvar NFE
      const nfe = {
        id: nfeId,
        data: nfeInfo.dataEmissao,
        numero: nfeInfo.numero,
        chaveNFE: nfeInfo.chaveNFE,
        fornecedor: nfeInfo.emitNome,
        valor: extractedProducts.reduce((sum, p) => sum + p.totalPrice, 0),
        itens: extractedProducts.length,
        produtos: extractedProducts,
        impostoEntrada: impostoEntrada
      };
      
      saveNFE(nfe);
      setCurrentTab("upload");
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo XML. Verifique se é uma NF-e válida.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleXmlFromSefaz = (xmlContent: string) => {
    handleFileSelect(new File([xmlContent], 'nfe.xml', { type: 'text/xml' }));
  };

  const extractInvoiceNumber = (xmlDoc: Document): string => {
    const ideNode = xmlDoc.querySelector('ide');
    if (!ideNode) return '';
    
    const numero = ideNode.querySelector('nNF')?.textContent || '';
    return numero;
  };

  const handleLoadNFe = (nfe: NFE) => {
    // Ao carregar uma NFE salva pela API, mapeia os produtos para o formato esperado pelos componentes
    const mappedProducts = Array.isArray(nfe.produtos)
      ? mapApiProductsToComponents(nfe.produtos as unknown as any[])
      : [];

    setProducts(mappedProducts);
    setHiddenItems(new Set());
    setCurrentNFeId(nfe.id);
    setInvoiceNumber(nfe.numero);
    setBrandName(nfe.fornecedor);
    setIsEditingBrand(false);
    setXmlContentForDataSystem(null);
    setCurrentTab("upload");

    // Gerenciar abas
    setNfeTabs(prev => {
      const exists = prev.some(t => t.id === nfe.id);
      const next = exists ? prev.map(t => t.id === nfe.id ? { ...t, numero: nfe.numero, fornecedor: nfe.fornecedor } : t)
                          : [...prev, { id: nfe.id, numero: nfe.numero, fornecedor: nfe.fornecedor, locked: false }];
      localStorage.setItem('nfeTabs', JSON.stringify(next));
      return next;
    });
    setActiveTabId(nfe.id);
    localStorage.setItem('nfeActiveTabId', nfe.id);

    // Escopo por nota para chaves locais
    const key = (k: string) => (nfe.numero ? `${nfe.numero}:${k}` : k);

    // Carregar preferências: se existir no localStorage, usa; caso contrário, aplica valor vindo da API e persiste localmente
    const localX = localStorage.getItem(key('xapuriMarkup'));
    if (localX) {
      setXapuriMarkup(parseInt(localX));
    } else if (typeof nfe.xapuriMarkup === 'number') {
      setXapuriMarkup(nfe.xapuriMarkup);
      localStorage.setItem(key('xapuriMarkup'), String(nfe.xapuriMarkup));
    }

    const localE = localStorage.getItem(key('epitaMarkup'));
    if (localE) {
      setEpitaMarkup(parseInt(localE));
    } else if (typeof nfe.epitaMarkup === 'number') {
      setEpitaMarkup(nfe.epitaMarkup);
      localStorage.setItem(key('epitaMarkup'), String(nfe.epitaMarkup));
    }

    const localR = localStorage.getItem(key('roundingType')) as RoundingType | null;
    if (localR) {
      setRoundingType(localR);
    } else if (typeof nfe.roundingType === 'string' && nfe.roundingType.length > 0) {
      setRoundingType(nfe.roundingType as RoundingType);
      localStorage.setItem(key('roundingType'), nfe.roundingType);
    }

    const localI = localStorage.getItem(key('impostoEntrada'));
    if (localI) {
      setImpostoEntrada(parseInt(localI));
    } else if (typeof nfe.impostoEntrada === 'number') {
      setImpostoEntrada(nfe.impostoEntrada);
      localStorage.setItem(key('impostoEntrada'), String(nfe.impostoEntrada));
    }

    // Valor do frete é lido dentro do ProductPreview a partir do localStorage; garante persistência local com dado do servidor
    if (typeof nfe.valorFrete === 'number') {
      const localFrete = localStorage.getItem(key('valorFrete'));
      if (!localFrete) {
        localStorage.setItem(key('valorFrete'), String(nfe.valorFrete));
      }
    }
  };

  const handleXapuriMarkupChange = (value: number) => {
    setXapuriMarkup(value);
    localStorage.setItem(scopedKey('xapuriMarkup'), value.toString());
  };

  const handleEpitaMarkupChange = (value: number) => {
    setEpitaMarkup(value);
    localStorage.setItem(scopedKey('epitaMarkup'), value.toString());
  };

  const handleImpostoEntradaChange = (value: number) => {
    setImpostoEntrada(value);
    localStorage.setItem(scopedKey('impostoEntrada'), value.toString());
  };

  const handleRoundingTypeChange = (value: RoundingType) => {
    setRoundingType(value);
    localStorage.setItem(scopedKey('roundingType'), value);
  };

  // Recarrega configurações quando a nota (invoiceNumber) muda
  useEffect(() => {
    if (!invoiceNumber) return;
    const savedX = localStorage.getItem(scopedKey('xapuriMarkup'));
    if (savedX) setXapuriMarkup(parseInt(savedX));
    const savedE = localStorage.getItem(scopedKey('epitaMarkup'));
    if (savedE) setEpitaMarkup(parseInt(savedE));
    const savedR = localStorage.getItem(scopedKey('roundingType')) as RoundingType | null;
    if (savedR) setRoundingType(savedR);
    const savedI = localStorage.getItem(scopedKey('impostoEntrada'));
    if (savedI) setImpostoEntrada(parseInt(savedI));
  }, [invoiceNumber]);

  const handleBrandNameChange = (newName: string) => {
    setBrandName(newName);
    setIsEditingBrand(false);
  };

  // Carregar NFe ativa do storage na primeira carga
  useEffect(() => {
    const loadActive = async () => {
      const active = activeTabId || localStorage.getItem('nfeActiveTabId');
      if (!active) return;
      try {
        const nfe = await nfeAPI.getById(active);
        handleLoadNFe(nfe as unknown as NFE);
      } catch (e) {
        console.error('Falha ao reabrir NFe ativa:', e);
      }
    };
    if (products.length === 0) {
      loadActive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escutar evento de lock vindo do ProductPreview e marcar a aba
  useEffect(() => {
    const onLocked = (e: any) => {
      const id = e?.detail?.nfeId as string | undefined;
      if (!id) return;
      setNfeTabs(prev => {
        const next = prev.map(t => t.id === id ? { ...t, locked: true } : t);
        localStorage.setItem('nfeTabs', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('nfe:locked' as any, onLocked as any);
    return () => window.removeEventListener('nfe:locked' as any, onLocked as any);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Barra de Abas de NFEs abertas */}
      <NfeTabs
        tabs={nfeTabs}
        activeId={activeTabId}
        onActivate={(id) => {
          setActiveTabId(id || null);
          if (id) {
            localStorage.setItem('nfeActiveTabId', id);
            // Recarrega a NFe ao ativar
            nfeAPI.getById(id).then(nfe => handleLoadNFe(nfe as unknown as NFE)).catch(() => {});
          } else {
            // Voltar ao Início (sem produtos carregados)
            setProducts([]);
            setHiddenItems(new Set());
          }
        }}
        onRequestClose={(id) => {
          // Só fecha se estiver concluída/locked (o componente já bloqueia visualmente)
          setNfeTabs(prev => {
            const next = prev.filter(t => t.id !== id);
            localStorage.setItem('nfeTabs', JSON.stringify(next));
            return next;
          });
          if (activeTabId === id) {
            const nextActive = nfeTabs.find(t => t.id !== id)?.id || null;
            setActiveTabId(nextActive);
            if (nextActive) localStorage.setItem('nfeActiveTabId', nextActive); else localStorage.removeItem('nfeActiveTabId');
          }
        }}
      />
      <div className="w-full px-4 py-8">
        {products.length === 0 && (
          <div className="w-full flex gap-8">
            {/* Sidebar com notas importadas */}
            {savedNFEs.length > 0 && (
              <div className="w-80 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <History size={20} />
                    Notas Importadas
                  </h3>
                  <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {savedNFEs.map((nfe) => (
                      <button
                        key={nfe.id}
                        onClick={() => handleLoadNFe(nfe)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="font-medium text-slate-900 group-hover:text-blue-700 truncate">
                          {nfe.fornecedor}
                        </div>
                        <div className="text-sm text-slate-600 flex items-center justify-between">
                          <span>NF-e {nfe.numero}</span>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {nfe.itens} itens
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo principal */}
            <div className="flex-1 space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
                  <Info size={16} />
                  <span>Importador de NF-e</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Importação de Produtos via XML</h1>
                <p className="text-slate-600 w-full max-w-2xl">
                  Faça upload do arquivo XML da NF-e ou consulte diretamente na SEFAZ para importar automaticamente os produtos
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="w-full">
                  <Tabs defaultValue="upload" value={currentTab} onValueChange={setCurrentTab} className="w-full">
                                      <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="upload">Upload de XML</TabsTrigger>
                    <TabsTrigger value="sefaz">Consulta SEFAZ</TabsTrigger>
                    <TabsTrigger value="pdf">Upload de PDF</TabsTrigger>
                  </TabsList>
                    
                    <TabsContent value="upload">
                      <FileUpload onFileSelect={handleFileSelect} />
                    </TabsContent>
                    
                    <TabsContent value="sefaz">
                      <SefazIntegration onXmlReceived={handleXmlFromSefaz} />
                    </TabsContent>

                    <TabsContent value="pdf">
                      <FileUploadPDF onItemsExtracted={setPdfItems} />
                      {pdfItems.length > 0 && (
                        <div className="mt-8">
                          <h2 className="text-xl font-bold mb-4 text-center">Produtos extraídos do PDF</h2>
                          <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                              <thead>
                                <tr>
                                  <th className="px-4 py-2 border">Item</th>
                                  <th className="px-4 py-2 border">Descrição</th>
                                  <th className="px-4 py-2 border">Quantidade</th>
                                  <th className="px-4 py-2 border">Total Bruto</th>
                                  <th className="px-4 py-2 border">Total Líquido</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pdfItems.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 border">{item.item}</td>
                                    <td className="px-4 py-2 border">{item.descricao}</td>
                                    <td className="px-4 py-2 border">{item.quantidade}</td>
                                    <td className="px-4 py-2 border">{item.totalBruto}</td>
                                    <td className="px-4 py-2 border">{item.totalLiquido}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
            <p className="mt-4 text-slate-600">Processando arquivo XML...</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="w-full animate-fade-up">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {isEditingBrand ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-96 text-base font-medium"
                      autoFocus
                      onBlur={() => handleBrandNameChange(brandName)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleBrandNameChange(brandName);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-medium">
                      {brandName}
                      {invoiceNumber && `: ${invoiceNumber}`}
                    </h1>
                    <button
                      onClick={() => setIsEditingBrand(true)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                      Excluir NF
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Nota Fiscal</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir esta nota fiscal? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteCurrentNFe} className="bg-red-600 hover:bg-red-700">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <ProductPreview
              products={products}
              hiddenItems={hiddenItems}
              onToggleVisibility={(index) => {
                const newHiddenItems = new Set(hiddenItems);
                if (newHiddenItems.has(index)) {
                  newHiddenItems.delete(index);
                } else {
                  newHiddenItems.add(index);
                }
                setHiddenItems(newHiddenItems);
              }}
              onNewFile={() => {
                setProducts([]);
                setHiddenItems(new Set());
                setCurrentNFeId(null);
                setInvoiceNumber("");
                setBrandName("");
                setIsEditingBrand(false);
                setXmlContentForDataSystem(null);
                setCurrentTab("upload");
              }}
              xapuriMarkup={xapuriMarkup}
              epitaMarkup={epitaMarkup}
              roundingType={roundingType}
              onXapuriMarkupChange={handleXapuriMarkupChange}
              onEpitaMarkupChange={handleEpitaMarkupChange}
              onRoundingTypeChange={handleRoundingTypeChange}
              invoiceNumber={invoiceNumber}
              nfeId={currentNFeId || undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

