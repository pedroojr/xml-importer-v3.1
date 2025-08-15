import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança para produção
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.sefaz.gov.br"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configurado para produção
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://seu-dominio.com',
    'https://www.seu-dominio.com',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuração do upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Inicializar banco de dados
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Criar tabelas se não existirem
const initDatabase = () => {
  // Tabela de NFEs
  db.exec(`
    CREATE TABLE IF NOT EXISTS nfes (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      numero TEXT NOT NULL,
      chaveNFE TEXT,
      fornecedor TEXT NOT NULL,
      valor REAL NOT NULL,
      itens INTEGER NOT NULL,
      impostoEntrada REAL DEFAULT 12,
      xapuriMarkup REAL DEFAULT 160,
      epitaMarkup REAL DEFAULT 130,
      roundingType TEXT DEFAULT 'none',
      valorFrete REAL DEFAULT 0,
      locked BOOLEAN DEFAULT 0,
      isFavorite BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Garantir coluna 'locked' em bases já existentes
  try {
    const columns = db.prepare("PRAGMA table_info(nfes)").all();
    const hasLocked = columns.some((c) => c.name === 'locked');
    if (!hasLocked) {
      db.exec("ALTER TABLE nfes ADD COLUMN locked BOOLEAN DEFAULT 0");
    }
  } catch (e) {
    console.warn('Aviso ao garantir coluna locked:', e?.message || e);
  }

  // Tabela de produtos
  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nfeId TEXT NOT NULL,
      codigo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      ncm TEXT,
      cfop TEXT,
      unidade TEXT,
      quantidade REAL NOT NULL,
      valorUnitario REAL NOT NULL,
      valorTotal REAL NOT NULL,
      baseCalculoICMS REAL,
      valorICMS REAL,
      aliquotaICMS REAL,
      baseCalculoIPI REAL,
      valorIPI REAL,
      aliquotaIPI REAL,
      ean TEXT,
      reference TEXT,
      brand TEXT,
      imageUrl TEXT,
      descricao_complementar TEXT,
      custoExtra REAL DEFAULT 0,
      freteProporcional REAL DEFAULT 0,
      FOREIGN KEY (nfeId) REFERENCES nfes(id) ON DELETE CASCADE
    )
  `);
  
  // Tabela de histórico de preços por produto
  db.exec(`
    CREATE TABLE IF NOT EXISTS precos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      descricao TEXT,
      nfeId TEXT,
      costUnit REAL,
      costNet REAL,
      priceXapuri REAL,
      priceEpita REAL,
      impostoEntrada REAL,
      xapuriMarkup REAL,
      epitaMarkup REAL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Índices para melhor performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_nfes_fornecedor ON nfes(fornecedor);
    CREATE INDEX IF NOT EXISTS idx_nfes_data ON nfes(data);
    CREATE INDEX IF NOT EXISTS idx_produtos_nfeId ON produtos(nfeId);
    CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
    CREATE INDEX IF NOT EXISTS idx_precos_codigo ON precos(codigo);
  `);
};

initDatabase();

// Middleware de logging para produção
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// SSE (Server-Sent Events) para atualizações em tempo real por NFE
const nfeStreams = new Map(); // nfeId -> Set<res>

function subscribeNfe(req, res) {
  const { id } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: ready\n`);
  res.write(`data: ${JSON.stringify({ id, ready: true, timestamp: Date.now() })}\n\n`);

  if (!nfeStreams.has(id)) nfeStreams.set(id, new Set());
  nfeStreams.get(id).add(res);

  const heartbeat = setInterval(() => {
    try { res.write(`event: ping\n` + `data: ${Date.now()}\n\n`); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const set = nfeStreams.get(id);
    if (set) {
      set.delete(res);
      if (set.size === 0) nfeStreams.delete(id);
    }
  });
}

function broadcastNfeUpdate(id, payload = {}) {
  const set = nfeStreams.get(String(id));
  if (!set || set.size === 0) return;
  const data = JSON.stringify({ id, updatedAt: new Date().toISOString(), ...payload });
  for (const res of set) {
    try { res.write(`event: nfe_updated\n` + `data: ${data}\n\n`); } catch (_) {}
  }
}

app.get('/api/stream/nfes/:id', subscribeNfe);

// Rotas da API

// GET - Listar todas as NFEs
app.get('/api/nfes', (req, res) => {
  try {
    // Primeiro buscar todas as NFEs
    const nfesStmt = db.prepare('SELECT * FROM nfes ORDER BY createdAt DESC');
    const nfes = nfesStmt.all();
    
    // Para cada NFE, buscar seus produtos
    const nfesComProdutos = nfes.map(nfe => {
      const produtosStmt = db.prepare('SELECT * FROM produtos WHERE nfeId = ?');
      const produtos = produtosStmt.all(nfe.id);
      
      return {
        ...nfe,
        produtos
      };
    });
    
    res.json(nfesComProdutos);
  } catch (error) {
    console.error('Erro ao buscar NFEs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Buscar NFE por ID
app.get('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar NFE
    const nfeStmt = db.prepare('SELECT * FROM nfes WHERE id = ?');
    const nfe = nfeStmt.get(id);
    
    if (!nfe) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Buscar produtos da NFE
    const produtosStmt = db.prepare('SELECT * FROM produtos WHERE nfeId = ?');
    const produtos = produtosStmt.all(id);
    
    res.json({
      ...nfe,
      produtos
    });
  } catch (error) {
    console.error('Erro ao buscar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova NFE
app.post('/api/nfes', (req, res) => {
  try {
    const { id, data, numero, chaveNFE, fornecedor, valor, itens, produtos, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete, locked } = req.body;
    
    // Calcular número de itens automaticamente se não fornecido
    const numeroItens = itens || (produtos && Array.isArray(produtos) ? produtos.length : 0);
    
    const insertNFE = db.prepare(`
      INSERT OR REPLACE INTO nfes (
        id, data, numero, chaveNFE, fornecedor, valor, itens, 
        impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete, locked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertProduto = db.prepare(`
      INSERT INTO produtos (
        nfeId, codigo, descricao, ncm, cfop, unidade, quantidade,
        valorUnitario, valorTotal, baseCalculoICMS, valorICMS, aliquotaICMS,
        baseCalculoIPI, valorIPI, aliquotaIPI, ean, reference, brand,
        imageUrl, descricao_complementar, custoExtra, freteProporcional
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const deleteProdutos = db.prepare('DELETE FROM produtos WHERE nfeId = ?');
    
    db.transaction(() => {
      // Inserir/atualizar NFE
      insertNFE.run(
        id, data, numero, chaveNFE, fornecedor, valor, numeroItens,
        impostoEntrada || 12, xapuriMarkup || 160, epitaMarkup || 130,
        roundingType || 'none', valorFrete || 0, locked ? 1 : 0
      );
      
      // Remover produtos antigos
      deleteProdutos.run(id);
      
      // Inserir novos produtos
      if (produtos && Array.isArray(produtos)) {
        produtos.forEach(produto => {
          insertProduto.run(
            id, produto.codigo, produto.descricao, produto.ncm, produto.cfop,
            produto.unidade, produto.quantidade, produto.valorUnitario,
            produto.valorTotal, produto.baseCalculoICMS, produto.valorICMS,
            produto.aliquotaICMS, produto.baseCalculoIPI, produto.valorIPI,
            produto.aliquotaIPI, produto.ean, produto.reference, produto.brand,
            produto.imageUrl, produto.descricao_complementar,
            produto.custoExtra || 0, produto.freteProporcional || 0
          );
        });
      }
    })();
    
    res.json({ message: 'NFE salva com sucesso', id });
    // Notificar inscritos
    broadcastNfeUpdate(id, { action: 'created_or_replaced' });
  } catch (error) {
    console.error('Erro ao salvar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar NFE
app.put('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { fornecedor, impostoEntrada, xapuriMarkup, epitaMarkup, roundingType, valorFrete, produtos, locked } = req.body;
    // Buscar valores atuais para fazer merge (evitar sobrescrever com undefined)
    const current = db.prepare('SELECT * FROM nfes WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    const mergedFornecedor = typeof fornecedor === 'string' && fornecedor.length > 0 ? fornecedor : current.fornecedor;
    const mergedImpostoEntrada = typeof impostoEntrada === 'number' ? impostoEntrada : current.impostoEntrada;
    const mergedXapuriMarkup = typeof xapuriMarkup === 'number' ? xapuriMarkup : current.xapuriMarkup;
    const mergedEpitaMarkup = typeof epitaMarkup === 'number' ? epitaMarkup : current.epitaMarkup;
    const mergedRoundingType = typeof roundingType === 'string' && roundingType.length > 0 ? roundingType : current.roundingType;
    const mergedValorFrete = typeof valorFrete === 'number' ? valorFrete : current.valorFrete;
    const mergedLocked = typeof locked === 'boolean' ? (locked ? 1 : 0) : current.locked;
    
    const updateStmt = db.prepare(`
      UPDATE nfes SET 
        fornecedor = ?, impostoEntrada = ?, xapuriMarkup = ?, 
        epitaMarkup = ?, roundingType = ?, valorFrete = ?, locked = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = updateStmt.run(
      mergedFornecedor, mergedImpostoEntrada, mergedXapuriMarkup, mergedEpitaMarkup,
      mergedRoundingType, mergedValorFrete, mergedLocked, id
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    // Se vierem produtos, registra os preços no histórico
    if (Array.isArray(produtos)) {
      const insertPreco = db.prepare(`
        INSERT INTO precos (
          codigo, descricao, nfeId, costUnit, costNet, priceXapuri, priceEpita,
          impostoEntrada, xapuriMarkup, epitaMarkup
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      produtos.forEach(p => {
        insertPreco.run(
          p.codigo, p.descricao, id, p.valorUnitario || 0, p.netPrice || 0,
          p.xapuriPrice || 0, p.epitaPrice || 0, impostoEntrada, xapuriMarkup, epitaMarkup
        );
      });
    }

    res.json({ message: 'NFE atualizada com sucesso' });
    // Notificar inscritos
    broadcastNfeUpdate(id, { action: 'updated' });
  } catch (error) {
    console.error('Erro ao atualizar NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Excluir NFE
app.delete('/api/nfes/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteStmt = db.prepare('DELETE FROM nfes WHERE id = ?');
    const result = deleteStmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'NFE não encontrada' });
    }
    
    res.json({ message: 'NFE excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir NFE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Upload de arquivo XML
app.post('/api/upload-xml', upload.single('xml'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const xmlContent = req.file.buffer.toString('utf-8');
    
    // Aqui você pode adicionar a lógica de parsing do XML
    // Por enquanto, apenas retornamos o conteúdo
    res.json({ 
      message: 'Arquivo recebido com sucesso',
      content: xmlContent.substring(0, 500) + '...' // Primeiros 500 caracteres
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Status do servidor
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString(),
    database: 'connected',
    environment: 'production'
  });
});

// GET - Histórico de preços por código
app.get('/api/precos/:codigo', (req, res) => {
  try {
    const { codigo } = req.params;
    const stmt = db.prepare('SELECT * FROM precos WHERE codigo = ? ORDER BY createdAt DESC LIMIT 100');
    const rows = stmt.all(codigo);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar histórico de preços:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de produção rodando na porta ${PORT}`);
  console.log(`📊 Banco de dados: ${dbPath}`);
  console.log(`🌐 Ambiente: Produção`);
  console.log(`📋 API Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  db.close();
  process.exit(0);
});
