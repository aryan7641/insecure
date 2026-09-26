const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

class DoclingProvider {
  constructor() {
    // Look for virtualenv Python or system Python
    this.pythonPath = process.env.DOCLING_PYTHON_PATH || 
      (fs.existsSync('/app/docling-env/bin/python3') ? '/app/docling-env/bin/python3' : 
      (fs.existsSync('/app/docling-env/bin/python') ? '/app/docling-env/bin/python' : 'python3'));
    
    this.scriptPath = path.join(__dirname, 'docling_extractor.py');
  }

  /**
   * Primary method to extract structured document output from PDF buffer
   * @param {Buffer} buffer 
   * @param {string} originalName 
   * @param {object} options 
   * @returns {Promise<object>}
   */
  async extractStructuredDocument(buffer, originalName = 'policy.pdf', options = {}) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Valid PDF buffer is required for Docling extraction');
    }

    const tempDir = os.tmpdir();
    const tempFileName = `docling_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
      await fs.promises.writeFile(tempFilePath, buffer);

      const args = [this.scriptPath, tempFilePath];
      if (options.forceOcr) {
        args.push('--force-ocr');
      }

      const rawJsonOutput = await this._executePythonScript(args);
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(rawJsonOutput);
      } catch (e) {
        console.warn('[DoclingProvider] Failed to parse JSON stdout from Python script:', e.message, 'Output preview:', rawJsonOutput.slice(0, 300));
        // Fallback: build basic structure from stdout text
        parsedOutput = {
          status: 'warning',
          engine: 'docling_fallback',
          isDigital: true,
          fullText: rawJsonOutput,
          markdown: rawJsonOutput,
          tables: [],
          headings: [],
          paragraphs: [],
          keyValues: {}
        };
      }

      // Ensure fullText is populated
      if (!parsedOutput.fullText && parsedOutput.markdown) {
        parsedOutput.fullText = parsedOutput.markdown;
      }
      parsedOutput.rawText = parsedOutput.fullText || parsedOutput.markdown || '';

      return parsedOutput;
    } catch (err) {
      console.error('[DoclingProvider] Docling extraction error:', err.message);
      // Return structured fallback
      const textFallback = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      return {
        status: 'warning',
        engine: 'pdf_parse_fallback',
        isDigital: textFallback.length > 50,
        pageCount: 1,
        fullText: textFallback,
        rawText: textFallback,
        markdown: textFallback,
        tables: [],
        headings: [],
        paragraphs: [],
        keyValues: {},
        warning: `Docling execution warning: ${err.message}`
      };
    } finally {
      // Clean up temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (cleanupErr) {
        console.warn('[DoclingProvider] Temp file cleanup warning:', cleanupErr.message);
      }
    }
  }

  /**
   * Helper to execute python subprocess with timeout
   */
  _executePythonScript(args) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, args, {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        maxBuffer: 50 * 1024 * 1024 // 50MB
      });

      let stdoutData = '';
      let stderrData = '';
      let isTimedOut = false;

      // 60-second timeout for large documents
      const timeout = setTimeout(() => {
        isTimedOut = true;
        pythonProcess.kill('SIGTERM');
        reject(new Error('Docling extraction process timed out after 60s'));
      }, 60000);

      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString('utf8');
      });

      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString('utf8');
      });

      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        if (!isTimedOut) reject(err);
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (isTimedOut) return;

        if (code !== 0 && !stdoutData.trim()) {
          reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
        } else {
          // If stdout has valid JSON despite non-zero code/stderr warnings, resolve
          resolve(stdoutData.trim());
        }
      });
    });
  }
}

let instance;
function getDoclingProvider() {
  if (!instance) instance = new DoclingProvider();
  return instance;
}

module.exports = {
  DoclingProvider,
  getDoclingProvider
};
