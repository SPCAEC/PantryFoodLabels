const express = require('express');
const multer = require('multer');
const PDFMerger = require('pdf-merger-js');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

app.post('/merge', async (req, res) => {
  try {
    const files = req.body.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).send('No files provided.');
    }

    const merger = new PDFMerger();
    for (const file of files) {
      const buffer = Buffer.from(file.data, 'base64');
      await merger.add(buffer);
    }

    const mergedBuffer = await merger.saveAsBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=merged.pdf');
    res.send(mergedBuffer);
  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).send('Error merging PDFs');
  }
});

app.get('/', (req, res) => {
  res.send('PDF Merge Service is up and running.');
});

app.listen(port, () => {
  console.log(`PDF Merge Service listening at http://localhost:${port}`);
});
