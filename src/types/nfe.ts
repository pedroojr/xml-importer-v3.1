export interface Product {
  // Campos da API (principais)
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
  ean?: string;
  reference?: string;
  brand?: string;
  imageUrl?: string;
  descricao_complementar?: string;
  freteProporcional?: number;
  custoExtra?: number;
  
  // Aliases para compatibilidade com componentes existentes
  code: string; // alias para codigo
  name: string; // alias para descricao
  uom: string; // alias para unidade
  quantity: number; // alias para quantidade
  unitPrice: number; // alias para valorUnitario
  totalPrice: number; // alias para valorTotal
  netPrice: number; // calculado
  discount: number; // calculado
  
  // Campos opcionais para funcionalidades avançadas
  xapuriPrice?: number;
  epitaPrice?: number;
  custoLiquido?: number;
  precoXapuri?: number;
  precoEpita?: number;
  salePrice?: number;
  color?: string;
  size?: string;
  fornecedor?: string;
  tags?: string[];
  
  // Campos para cálculos
  impostoEntrada?: number;
}

export interface NFE {
  id: string;
  data: string;
  numero: string;
  chaveNFE: string;
  valorTotal: number;
  totalImpostos: number;
  quantidadeTotal: number;
  dataEmissao: string;
  fornecedor: string;
  cnpjFornecedor: string;
  produtos: Product[];
  isFavorite?: boolean;
  itens?: number;
  valor?: number;
  brandName?: string;
  invoiceNumber?: string;
  impostoEntrada: number;
}

export interface NFEItem {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valor: number;
  unidade: string;
  ncm: string;
  cfop: string;
  impostos: {
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
  };
}

export interface SavedNFe {
  id: string;
  products: Product[];
  date: string;
  name: string;
  invoiceNumber?: string;
  brandName?: string;
  hiddenItems?: Set<number>;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: string;
}
