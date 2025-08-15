import { Product } from '@/types/nfe';

/**
 * Mapeia um produto da API para o formato esperado pelos componentes
 */
export function mapApiProductToComponent(apiProduct: any): Product {
  console.log('🔄 Mapeando produto da API:', apiProduct);
  
  // Verificar se o produto tem os campos necessários
  if (!apiProduct) {
    console.error('❌ Produto da API é null ou undefined');
    return {} as Product;
  }
  
  console.log('🔍 Campos do produto da API:');
  console.log('  - codigo:', apiProduct.codigo);
  console.log('  - descricao:', apiProduct.descricao);
  console.log('  - quantidade:', apiProduct.quantidade);
  console.log('  - valorTotal:', apiProduct.valorTotal);
  
  const mappedProduct = {
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
    xapuriPrice: apiProduct.xapuriPrice ?? apiProduct.precoXapuri,
    epitaPrice: apiProduct.epitaPrice ?? apiProduct.precoEpita,
    custoLiquido: apiProduct.custoLiquido,
    precoXapuri: apiProduct.precoXapuri,
    precoEpita: apiProduct.precoEpita,
    salePrice: apiProduct.salePrice,
    color: apiProduct.color,
    size: apiProduct.size,
    fornecedor: apiProduct.fornecedor,
    tags: apiProduct.tags,
    
    // Campos para cálculos
    impostoEntrada: apiProduct.impostoEntrada,
  };
  
  console.log('✅ Produto mapeado com sucesso:');
  console.log('  - code (alias):', mappedProduct.code);
  console.log('  - name (alias):', mappedProduct.name);
  console.log('  - quantity (alias):', mappedProduct.quantity);
  console.log('  - totalPrice (alias):', mappedProduct.totalPrice);
  
  return mappedProduct;
}

/**
 * Mapeia uma lista de produtos da API
 */
export function mapApiProductsToComponents(apiProducts: any[]): Product[] {
  console.log('🔄 Mapeando produtos da API:', apiProducts.length);
  
  if (!Array.isArray(apiProducts)) {
    console.error('❌ apiProducts não é um array:', typeof apiProducts);
    return [];
  }
  
  const mappedProducts = apiProducts.map(mapApiProductToComponent);
  console.log('✅ Produtos mapeados:', mappedProducts.length);
  
  return mappedProducts;
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
