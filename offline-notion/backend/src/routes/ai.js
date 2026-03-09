const express = require('express');
const router = express.Router();
const http = require('http');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3';

async function ollamaRequest(prompt, model = DEFAULT_MODEL) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      prompt,
      stream: false,
    });

    const urlObj = new URL(`${OLLAMA_HOST}/api/generate`);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 11434,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.response || '');
        } catch (e) {
          reject(new Error('Failed to parse Ollama response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Ollama request timeout'));
    });

    req.write(body);
    req.end();
  });
}

// Check if Ollama is available
router.get('/status', async (req, res) => {
  try {
    const response = await new Promise((resolve, reject) => {
      const urlObj = new URL(`${OLLAMA_HOST}/api/tags`);
      const req = http.get({
        hostname: urlObj.hostname,
        port: urlObj.port || 11434,
        path: urlObj.pathname,
        timeout: 3000,
      }, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });

    const models = response.models?.map(m => m.name) || [];
    res.json({ available: true, models });
  } catch {
    res.json({ available: false, models: [] });
  }
});

// Summarize page content
router.post('/summarize', async (req, res) => {
  const { content, model } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  try {
    const prompt = `Please provide a concise summary of the following content in 2-3 sentences:\n\n${content}\n\nSummary:`;
    const result = await ollamaRequest(prompt, model);
    res.json({ result });
  } catch (err) {
    res.status(503).json({ error: `AI not available: ${err.message}` });
  }
});

// Rewrite text
router.post('/rewrite', async (req, res) => {
  const { text, style = 'clear and professional', model } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const prompt = `Rewrite the following text to be more ${style}. Only return the rewritten text, no explanations:\n\n${text}\n\nRewritten:`;
    const result = await ollamaRequest(prompt, model);
    res.json({ result });
  } catch (err) {
    res.status(503).json({ error: `AI not available: ${err.message}` });
  }
});

// Generate ideas
router.post('/ideas', async (req, res) => {
  const { topic, count = 5, model } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  try {
    const prompt = `Generate ${count} creative and actionable ideas about: "${topic}"\n\nFormat as a numbered list. Be specific and practical.\n\nIdeas:`;
    const result = await ollamaRequest(prompt, model);
    res.json({ result });
  } catch (err) {
    res.status(503).json({ error: `AI not available: ${err.message}` });
  }
});

// Continue writing
router.post('/continue', async (req, res) => {
  const { text, model } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const prompt = `Continue writing the following text naturally and coherently. Only return the continuation (not the original text), keeping the same style and tone. Write 2-3 sentences:\n\n${text}\n\nContinuation:`;
    const result = await ollamaRequest(prompt, model);
    res.json({ result });
  } catch (err) {
    res.status(503).json({ error: `AI not available: ${err.message}` });
  }
});

// Ask anything
router.post('/ask', async (req, res) => {
  const { question, context, model } = req.body;
  if (!question) return res.status(400).json({ error: 'question required' });

  try {
    const contextPart = context ? `\nContext from current page:\n${context}\n\n` : '';
    const prompt = `${contextPart}Question: ${question}\n\nAnswer:`;
    const result = await ollamaRequest(prompt, model);
    res.json({ result });
  } catch (err) {
    res.status(503).json({ error: `AI not available: ${err.message}` });
  }
});

module.exports = router;
