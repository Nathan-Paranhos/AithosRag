import express from 'express';

const router = express.Router();

// Obter estatísticas do cache
router.get('/stats', (req, res) => {
  try {
    const stats = req.cacheSystem.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Limpar cache por categoria
router.delete('/clear/:category?', (req, res) => {
  try {
    const { category } = req.params;
    
    if (category) {
      req.cacheSystem.clearCategory(category);
      res.json({
        success: true,
        message: `Cache da categoria '${category}' limpo com sucesso`
      });
    } else {
      req.cacheSystem.clear();
      res.json({
        success: true,
        message: 'Todo o cache foi limpo com sucesso'
      });
    }
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Obter configurações do cache
router.get('/config', (req, res) => {
  try {
    const config = req.cacheSystem.getConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Erro ao obter configurações do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar configurações do cache
router.put('/config', (req, res) => {
  try {
    const { maxSize, defaultTTL, compressionEnabled } = req.body;
    
    const updates = {};
    if (maxSize !== undefined) updates.maxSize = maxSize;
    if (defaultTTL !== undefined) updates.defaultTTL = defaultTTL;
    if (compressionEnabled !== undefined) updates.compressionEnabled = compressionEnabled;
    
    req.cacheSystem.updateConfig(updates);
    
    res.json({
      success: true,
      message: 'Configurações do cache atualizadas com sucesso',
      data: req.cacheSystem.getConfig()
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Obter chaves do cache por categoria
router.get('/keys/:category?', (req, res) => {
  try {
    const { category } = req.params;
    const keys = req.cacheSystem.getKeys(category);
    
    res.json({
      success: true,
      data: {
        category: category || 'all',
        keys: keys,
        count: keys.length
      }
    });
  } catch (error) {
    console.error('Erro ao obter chaves do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Verificar se uma chave existe no cache
router.get('/exists/:key', (req, res) => {
  try {
    const { key } = req.params;
    const exists = req.cacheSystem.has(key);
    
    res.json({
      success: true,
      data: {
        key: key,
        exists: exists
      }
    });
  } catch (error) {
    console.error('Erro ao verificar chave do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Remover uma chave específica do cache
router.delete('/key/:key', (req, res) => {
  try {
    const { key } = req.params;
    const removed = req.cacheSystem.delete(key);
    
    res.json({
      success: true,
      data: {
        key: key,
        removed: removed
      },
      message: removed ? 'Chave removida com sucesso' : 'Chave não encontrada'
    });
  } catch (error) {
    console.error('Erro ao remover chave do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Forçar limpeza de entradas expiradas
router.post('/cleanup', (req, res) => {
  try {
    const cleaned = req.cacheSystem.cleanupExpired();
    
    res.json({
      success: true,
      data: {
        cleanedEntries: cleaned
      },
      message: `${cleaned} entradas expiradas foram removidas`
    });
  } catch (error) {
    console.error('Erro ao limpar entradas expiradas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Salvar cache em disco
router.post('/save', async (req, res) => {
  try {
    await req.cacheSystem.saveToDisk();
    
    res.json({
      success: true,
      message: 'Cache salvo em disco com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar cache em disco:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Carregar cache do disco
router.post('/load', async (req, res) => {
  try {
    await req.cacheSystem.loadFromDisk();
    
    res.json({
      success: true,
      message: 'Cache carregado do disco com sucesso'
    });
  } catch (error) {
    console.error('Erro ao carregar cache do disco:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;