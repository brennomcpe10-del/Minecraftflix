import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { INITIAL_SERIES } from './server/defaultData';
import { Series, Episode } from './src/types';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'portal_data.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Garantir diretórios necessários
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Inicializar ou ler arquivo de dados
function loadData(): Series[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler portal_data.json, utilizando dados iniciais:', err);
  }
  // Se não existir ou estiver vazio, grava os dados iniciais
  saveData(INITIAL_SERIES);
  return INITIAL_SERIES;
}

function saveData(data: Series[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar portal_data.json:', err);
  }
}

// Configuração do Multer para uploads de arquivos de vídeo
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // Limite de até 1GB para vídeos
  },
});

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Servir uploads de vídeos diretamente
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- ROTAS DA API ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Portal de Episódios' });
  });

  // Autenticação simples de Administrador
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true, message: 'Autenticado com sucesso no Modo Administrador' });
    }
    return res.status(401).json({ success: false, message: 'Senha incorreta. A senha padrão de teste é admin123' });
  });

  // Listar todas as séries com episódios
  app.get('/api/series', (_req, res) => {
    const series = loadData();
    res.json(series);
  });

  // Obter série por ID
  app.get('/api/series/:id', (req, res) => {
    const series = loadData();
    const item = series.find(s => s.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Série não encontrada' });
    }
    res.json(item);
  });

  // Criar nova série
  app.post('/api/series', (req, res) => {
    const seriesList = loadData();
    const newSeries: Series = {
      id: req.body.id || `series-${Date.now()}`,
      title: req.body.title || 'Sem Título',
      originalTitle: req.body.originalTitle || '',
      synopsis: req.body.synopsis || '',
      posterUrl: req.body.posterUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      bannerUrl: req.body.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
      releaseYear: Number(req.body.releaseYear) || new Date().getFullYear(),
      genres: Array.isArray(req.body.genres) ? req.body.genres : ['Série'],
      status: req.body.status || 'Em Lançamento',
      totalSeasons: Number(req.body.totalSeasons) || 1,
      ageRating: req.body.ageRating || '14+',
      featured: Boolean(req.body.featured),
      createdAt: new Date().toISOString(),
      episodes: [],
    };

    seriesList.unshift(newSeries);
    saveData(seriesList);
    res.status(201).json(newSeries);
  });

  // Atualizar série
  app.put('/api/series/:id', (req, res) => {
    const seriesList = loadData();
    const index = seriesList.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Série não encontrada' });
    }

    const current = seriesList[index];
    seriesList[index] = {
      ...current,
      title: req.body.title ?? current.title,
      originalTitle: req.body.originalTitle ?? current.originalTitle,
      synopsis: req.body.synopsis ?? current.synopsis,
      posterUrl: req.body.posterUrl ?? current.posterUrl,
      bannerUrl: req.body.bannerUrl ?? current.bannerUrl,
      releaseYear: Number(req.body.releaseYear) || current.releaseYear,
      genres: Array.isArray(req.body.genres) ? req.body.genres : current.genres,
      status: req.body.status ?? current.status,
      totalSeasons: Number(req.body.totalSeasons) || current.totalSeasons,
      ageRating: req.body.ageRating ?? current.ageRating,
      featured: req.body.featured !== undefined ? Boolean(req.body.featured) : current.featured,
    };

    saveData(seriesList);
    res.json(seriesList[index]);
  });

  // Excluir série
  app.delete('/api/series/:id', (req, res) => {
    const seriesList = loadData();
    const filtered = seriesList.filter(s => s.id !== req.params.id);
    if (filtered.length === seriesList.length) {
      return res.status(404).json({ error: 'Série não encontrada' });
    }
    saveData(filtered);
    res.json({ success: true, message: 'Série excluída com sucesso' });
  });

  // Adicionar episódio à série
  app.post('/api/series/:seriesId/episodes', (req, res) => {
    const seriesList = loadData();
    const seriesIndex = seriesList.findIndex(s => s.id === req.params.seriesId);
    if (seriesIndex === -1) {
      return res.status(404).json({ error: 'Série não encontrada' });
    }

    const series = seriesList[seriesIndex];
    const newEpisode: Episode = {
      id: req.body.id || `ep-${Date.now()}`,
      seriesId: series.id,
      seasonNumber: Number(req.body.seasonNumber) || 1,
      episodeNumber: Number(req.body.episodeNumber) || (series.episodes.length + 1),
      title: req.body.title || `Episódio ${req.body.episodeNumber || series.episodes.length + 1}`,
      description: req.body.description || '',
      sourceType: req.body.sourceType || 'web_url',
      videoUrl: req.body.videoUrl || '',
      googleDriveId: req.body.googleDriveId,
      downloadUrl: req.body.downloadUrl || req.body.videoUrl,
      thumbnailUrl: req.body.thumbnailUrl || series.posterUrl,
      durationMinutes: Number(req.body.durationMinutes) || 24,
      fileSizeBytes: req.body.fileSizeBytes ? Number(req.body.fileSizeBytes) : undefined,
      fileSizeFormatted: req.body.fileSizeFormatted,
      resolution: req.body.resolution || '1080p HD',
      createdAt: new Date().toISOString(),
    };

    series.episodes.push(newEpisode);

    // Atualizar quantidade de temporadas se o episódio tiver temporada maior
    if (newEpisode.seasonNumber > series.totalSeasons) {
      series.totalSeasons = newEpisode.seasonNumber;
    }

    saveData(seriesList);
    res.status(201).json(newEpisode);
  });

  // Atualizar episódio
  app.put('/api/series/:seriesId/episodes/:episodeId', (req, res) => {
    const seriesList = loadData();
    const series = seriesList.find(s => s.id === req.params.seriesId);
    if (!series) {
      return res.status(404).json({ error: 'Série não encontrada' });
    }

    const epIndex = series.episodes.findIndex(e => e.id === req.params.episodeId);
    if (epIndex === -1) {
      return res.status(404).json({ error: 'Episódio não encontrado' });
    }

    const current = series.episodes[epIndex];
    series.episodes[epIndex] = {
      ...current,
      title: req.body.title ?? current.title,
      description: req.body.description ?? current.description,
      seasonNumber: Number(req.body.seasonNumber) || current.seasonNumber,
      episodeNumber: Number(req.body.episodeNumber) || current.episodeNumber,
      sourceType: req.body.sourceType ?? current.sourceType,
      videoUrl: req.body.videoUrl ?? current.videoUrl,
      googleDriveId: req.body.googleDriveId ?? current.googleDriveId,
      downloadUrl: req.body.downloadUrl ?? current.downloadUrl,
      thumbnailUrl: req.body.thumbnailUrl ?? current.thumbnailUrl,
      durationMinutes: Number(req.body.durationMinutes) || current.durationMinutes,
      fileSizeBytes: req.body.fileSizeBytes !== undefined ? Number(req.body.fileSizeBytes) : current.fileSizeBytes,
      fileSizeFormatted: req.body.fileSizeFormatted ?? current.fileSizeFormatted,
      resolution: req.body.resolution ?? current.resolution,
    };

    saveData(seriesList);
    res.json(series.episodes[epIndex]);
  });

  // Excluir episódio
  app.delete('/api/series/:seriesId/episodes/:episodeId', (req, res) => {
    const seriesList = loadData();
    const series = seriesList.find(s => s.id === req.params.seriesId);
    if (!series) {
      return res.status(404).json({ error: 'Série não encontrada' });
    }

    const filtered = series.episodes.filter(e => e.id !== req.params.episodeId);
    if (filtered.length === series.episodes.length) {
      return res.status(404).json({ error: 'Episódio não encontrado' });
    }

    series.episodes = filtered;
    saveData(seriesList);
    res.json({ success: true, message: 'Episódio excluído' });
  });

  // Upload direto de arquivo de vídeo
  app.post('/api/upload', upload.single('videoFile'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const size = req.file.size;
    const units = ['B', 'KB', 'MB', 'GB'];
    let formattedSize = size;
    let uIndex = 0;
    while (formattedSize >= 1024 && uIndex < units.length - 1) {
      formattedSize /= 1024;
      uIndex++;
    }

    res.json({
      success: true,
      fileUrl,
      originalName: req.file.originalname,
      filename: req.file.filename,
      sizeBytes: size,
      sizeFormatted: `${formattedSize.toFixed(1)} ${units[uIndex]}`,
      mimeType: req.file.mimetype,
    });
  });

  // Resetar para dados de amostra
  app.post('/api/reset-data', (_req, res) => {
    saveData(INITIAL_SERIES);
    res.json({ success: true, message: 'Dados restaurados para o estado padrão' });
  });

  // --- VITE MIDDLEWARE (DEV) & STATIC FILES (PROD) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Portal de Episódios rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
