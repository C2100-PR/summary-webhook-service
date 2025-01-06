const functions = require('@google-cloud/functions-framework');
const { Logging } = require('@google-cloud/logging');
const logging = new Logging();

functions.http('summary-webhook', async (req, res) => {
  const log = logging.log('summary-webhook-log');
  
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are accepted');
    }

    if (!req.body || !req.body.text) {
      throw new Error('Request body must contain a text field');
    }

    await log.write(log.entry({
      severity: 'INFO',
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: 'summary-webhook',
          region: 'us-west1'
        }
      }
    }, {
      message: 'Processing request',
      textLength: req.body.text.length
    }));

    const summary = await processSummary(req.body.text);
    res.status(200).json({
      summary,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    await log.write(log.entry({
      severity: 'ERROR',
      resource: {
        type: 'cloud_function',
        labels: {
          function_name: 'summary-webhook',
          region: 'us-west1'
        }
      }
    }, {
      error: error.message
    }));

    res.status(400).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

async function processSummary(text) {
  return {
    original_length: text.length,
    summary: text.substring(0, Math.min(text.length, 200)),
    keywords: extractKeywords(text)
  };
}

function extractKeywords(text) {
  const words = text.toLowerCase().split(/\W+/);
  const frequencies = {};
  
  words.forEach(word => {
    if (word && word.length > 3) {
      frequencies[word] = (frequencies[word] || 0) + 1;
    }
  });

  return Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}