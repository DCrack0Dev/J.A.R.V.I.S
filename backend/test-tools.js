const OpenAI = require('openai');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const TOOLS = [ 
  { 
    type: 'function', 
    function: { 
      name: 'search_web', 
      description: 
        'Search the internet for current, real-time information.', 
      parameters: { 
        type: 'object', 
        properties: { 
          query: { 
            type: 'string', 
            description: 'The search query to look up', 
          }, 
        }, 
        required: ['query'], 
      }, 
    }, 
  }, 
];

async function test() {
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  try {
    console.log('Testing tool detection with Llama...');
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [{ role: 'user', content: 'PREMIER LEAGUE TODAY' }],
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 100,
    });
    console.log('Response:', JSON.stringify(response.choices[0].message, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
