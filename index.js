const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const { mdEscape } = require("markdown-escape");
const fs = require("fs");

const app = express();

app.get('/', (req, res) => {
  res.send('Jinda hu');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const botToken = process.env.TELEGRAM_BOT_KEY;
const bot = new Telegraf(botToken);

const messageProcessingDelay = 1000;

try {
  bot.command("yt", async (ctx) => {
    try {
      const apiKey = "AIzaSyARIp8blKZ4aecnymh4XsC_dmbSw5S-1_I";
      const query = ctx.message.text.split(" ").slice(1).join(" ");

      if (!query) {
        ctx.reply("Please provide a search query for YouTube.");
        return;
      }

      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query,
      )}&type=video&key=${apiKey}`;
      const response = await axios.get(url);

      const video = response.data.items[0];

      if (video) {
        const videoTitle = video.snippet.title;
        const videoURL = `https://www.youtube.com/watch?v=${video.id.videoId}`;

        ctx.reply(`Top Result:\nTitle: ${videoTitle}\nURL: ${videoURL}`);
      } else {
        ctx.reply("No results found for the given query.");
      }
    } catch (error) {
      console.error(
        "Error processing YouTube command:",
        error.response?.data || error.message,
      );
      ctx.reply("Error processing the YouTube command. Please try again later.");
    }
  });

  const githubToken = process.env.GITHUB_ACCESS_TOKEN;

  bot.command("github", async (ctx) => {
    try {
      const commandArguments = ctx.message.text.split(" ").slice(1);

      if (commandArguments.length < 2) {
        ctx.reply(
          "Please provide both a search query and a programming language.",
        );
        return;
      }

      const query = commandArguments.slice(0, -1).join(" ");
      const language = commandArguments[commandArguments.length - 1];

      const githubResponse = await searchGitHub(query, language);

      if (githubResponse.items.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * githubResponse.items.length,
        );
        const randomRepo = githubResponse.items[randomIndex];

        const repoName = randomRepo.full_name;
        const resultMessage = `Repository: ${repoName}\nDescription: ${randomRepo.description}\nLink: ${randomRepo.html_url}\n\n`;
        ctx.reply(resultMessage);
      } else {
        ctx.reply(
          `No GitHub repositories found for the query "${query}" with programming language "${language}".`,
        );
      }
    } catch (error) {
      console.error("Error processing github command:", error);
      ctx.reply("Error processing the github command. Please try again later.");
    }
  });

  async function searchGitHub(query, language) {
    const apiUrl = "https://api.github.com/search/repositories";

    try {
      const response = await axios.get(
        `${apiUrl}?q=${query}+language:${language}&sort=stars&order=desc`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
          },
        },
      );

      if (!response.data) {
        throw new Error(
          `GitHub API request failed with status ${response.status}`,
        );
      }

      return response.data;
    } catch (error) {
      console.error("Error in GitHub API request:", error);
      throw new Error("Failed to retrieve data from GitHub API.");
    }
  }

  bot.on('text', async (ctx) => {
    try {
      const queryPrefix = "You are Sana your work is to reply people when they send message don't reveal you are a bot behave as human a message just came reply it: ";
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

      if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
        throw new Error('Invalid response from Gemini API');
      }

      const textValue = response.data.candidates[0].content.parts[0].text;

      const replyMessage = `${textValue}`;
      ctx.reply(replyMessage, { reply_to_message_id: ctx.message.message_id });

      setTimeout(() => {
        // Continue with other asynchronous operations if needed
      }, messageProcessingDelay);

    } catch (error) {
      console.error('Error during processing:', error.response?.data || error.message);
      ctx.reply('Error during processing. Please try again later.');
    }
  });

  bot.launch();
} catch (error) {
  console.error('Error during bot setup:', error);
}

process.on('unhandledRejection', (error) => {
  try {
    console.error('Unhandled Rejection:', error);
  } catch (handleError) {
    console.error('Error handling unhandled rejection:', handleError);
  }
});
