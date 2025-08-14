import { Product } from '@/types/nfe';

/**
 * Mapeia um produto da API para o formato esperado pelos componentes
 */
export function mapApiProductToComponent(apiProduct: any): Product {
  return {
    // Campos da API (principais)
    codigo: apiProduct.codigo || '',
    descricao: apiProduct.descricao || '',
    ncm: apiProduct.ncm || '',
    cfop: apiProduct.cfop || '',
    unidade: apiProduct.unidade || '',
    quantidade: apiProduct.quantidade || 0,
    valorUnitario: apiProduct.valorUnitario || 0,
    valorTotal: apiProduct.valorTotal || 0,
    baseCalculoICMS: apiProduct.baseCalculoICMS || 0,
    valorICMS: apiProduct.valorICMS || 0,
    aliquotaICMS: apiProduct.aliquotaICMS || 0,
    baseCalculoIPI: apiProduct.baseCalculoIPI || 0,
    valorIPI: apiProduct.valorIPI || 0,
    aliquotaIPI: apiProduct.aliquotaIPI || 0,
    ean: apiProduct.ean || '',
    reference: apiProduct.reference || '',
    brand: apiProduct.brand || '',
    imageUrl: apiProduct.imageUrl || '',
    descricao_complementar: apiProduct.descricao_complementar || '',
    freteProporcional: apiProduct.freteProporcional || 0,
    custoExtra: apiProduct.custoExtra || 0,
    
    // Aliases para compatibilidade com componentes existentes
    code: apiProduct.codigo || '', // alias para codigo
    name: apiProduct.descricao || '', // alias para descricao
    uom: apiProduct.unidade || '', // alias para unidade
    quantity: apiProduct.quantidade || 0, // alias para quantidade
    unitPrice: apiProduct.valorUnitario || 0, // alias para valorUnitario
    totalPrice: apiProduct.valorTotal || 0, // alias para valorTotal
    netPrice: apiProduct.valorTotal || 0, // calculado (pode ser ajustado depois)
    discount: 0, // calculado (pode ser ajustado depois)
    
    // Campos opcionais para funcionalidades avançadas
    xapuriPrice: apiProduct.xapuriPrice,
    epitaPrice: apiProduct.epitaPrice,
    salePrice: apiProduct.salePrice,
    color: apiProduct.color,
    size: apiProduct.size,
    fornecedor: apiProduct.fornecedor,
    tags: apiProduct.tags,
    
    // Campos para cálculos
    impostoEntrada: apiProduct.impostoEntrada,
  };
}

/**
 * Mapeia uma lista de produtos da API
 */
export function mapApiProductsToComponents(apiProducts: any[]): Product[] {
  return apiProducts.map(mapApiProductToComponent);
}

/**
 * Mapeia uma NFE da API para incluir produtos mapeados
 */
export function mapApiNFEToComponent(apiNFE: any) {
  return {
    ...apiNFE,
    produtos: mapApiProductsToComponents(apiNFE.produtos || [])
  };
}
