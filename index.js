  const express = require('express');
  const { Telegraf } = require('telegraf');
  const axios = require('axios');

  const app = express();

  // Express.js server
  app.get('/', (req, res) => {
    res.send('Jinda hu');
  });

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // Telegraf bot
  const botToken = process.env.TELEGRAM_BOT_KEY;
  const bot = new Telegraf(botToken);

  // Introduce delay between messages to avoid conflicts
  const messageProcessingDelay = 1000; // 1000 milliseconds (1 second)

  bot.on('text', async (ctx) => {
    console.log('Received text:', ctx.message.text);

    try {
      // Your existing Telegraf bot code...

      const queryPrefix = "You are Prakhar Doneria (prakha दौनेरिया) your work is to reply people when they send message don't reveal you are a bot behave as human a message just came reply it: ";
      const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      const geminiApiKey = process.env.GEMINI;

      const userQuery = ctx.message.text;
      const fullQuery = queryPrefix + userQuery;

      const params = {
        contents: [{
          parts: [{ text: fullQuery.replace(/([()])/g, '\\$1') }],
        }],
      };

      const headers = {
        'Content-Type': 'application/json',
      };

      const urlWithApiKey = `${apiUrl}?key=${geminiApiKey}`;

      const response = await axios.post(urlWithApiKey, params, { headers });

      const textValue = response.data.candidates[0].content.parts[0].text;

      const replyMessage = `${textValue}`;
      ctx.reply(replyMessage, { reply_to_message_id: ctx.message.message_id });

      // Introduce a delay before processing the next message
      setTimeout(() => {
        // Continue with other asynchronous operations if needed
      }, messageProcessingDelay);

    } catch (error) {
      console.error('Error during processing:', error.response?.data || error.message);
      ctx.reply('Error during processing. Please try again later.');
    }
  });

  // Handle unhandled errors
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
  });

  // Start the bot
  bot.launch();
