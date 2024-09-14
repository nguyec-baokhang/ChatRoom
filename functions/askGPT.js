const {OpenAI} = require('openai');
const dotenv = require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.API_KEY
});

const askGPT = async (question) => {
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: question,
        }
      ],
    });
    return gptResponse.choices[0].message.content;
  };

module.exports = {askGPT};
